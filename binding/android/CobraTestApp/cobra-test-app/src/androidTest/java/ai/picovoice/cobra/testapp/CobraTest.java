/*
    Copyright 2021-2024 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.cobra.testapp;

import android.content.Context;
import android.content.res.AssetManager;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.List;

import ai.picovoice.cobra.Cobra;
import ai.picovoice.cobra.CobraException;

import static org.junit.Assert.*;


@RunWith(AndroidJUnit4.class)
public class CobraTest {

    Context testContext;
    Context appContext;
    AssetManager assetManager;
    String testResourcesPath;

    String accessKey = "";

    @Before
    public void Setup() throws IOException {
        testContext = InstrumentationRegistry.getInstrumentation().getContext();
        appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assetManager = testContext.getAssets();
        extractAssetsRecursively("test_resources");
        testResourcesPath = new File(appContext.getFilesDir(), "test_resources").getAbsolutePath();

        accessKey = appContext.getString(R.string.pvTestingAccessKey);
    }

    @Test
    public void testProcess() throws CobraException {
        Cobra cobra = new Cobra(accessKey);

        File testAudio = new File(testResourcesPath, "audio/sample.wav");

        List<Float> probs = new ArrayList<>();

        try {
            FileInputStream audioInputStream = new FileInputStream(testAudio);

            byte[] rawData = new byte[cobra.getFrameLength() * 2];
            short[] pcm = new short[cobra.getFrameLength()];
            ByteBuffer pcmBuff = ByteBuffer.wrap(rawData).order(ByteOrder.LITTLE_ENDIAN);

            audioInputStream.skip(44);

            while (audioInputStream.available() > 0) {
                int numRead = audioInputStream.read(pcmBuff.array());
                if (numRead == cobra.getFrameLength() * 2) {
                    pcmBuff.asShortBuffer().get(pcm);
                    probs.add(cobra.process(pcm));
                }
            }
        } catch (Exception e) {
            throw new CobraException(e);
        }

        cobra.delete();

        float[] labels = {
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        };

        assertSame(labels.length, probs.size());

        float error = 0.f;

        for (int i = 0; i < probs.size(); i++) {
            error -= (labels[i] * Math.log(probs.get(i))) + ((1 - labels[i]) * Math.log(1 - probs.get(i)));
        }

        error /= probs.size();
        assertTrue(error < 0.1);
    }

    @Test
    public void testVersion() throws CobraException {
        Cobra cobra = new Cobra(accessKey);
        assertTrue(cobra.getVersion().length() > 0);
    }

    @Test
    public void testErrorStack() {
        String[] error = {};
        try {
            Cobra cobra = new Cobra("invalid");
        } catch (CobraException e) {
            error = e.getMessageStack();
        }

        assertTrue(0 < error.length);
        assertTrue(error.length <= 8);

        try {
            Cobra cobra = new Cobra("invalid");
        } catch (CobraException e) {
            for (int i = 0; i < error.length; i++) {
                assertEquals(e.getMessageStack()[i], error[i]);
            }
        }
    }

    private void extractAssetsRecursively(String path) throws IOException {

        String[] list = assetManager.list(path);
        if (list.length > 0) {
            File outputFile = new File(appContext.getFilesDir(), path);
            if (!outputFile.exists()) {
                outputFile.mkdirs();
            }

            for (String file : list) {
                String filepath = path + "/" + file;
                extractAssetsRecursively(filepath);
            }
        } else {
            extractTestFile(path);
        }
    }

    private void extractTestFile(String filepath) throws IOException {

        InputStream is = new BufferedInputStream(assetManager.open(filepath), 256);
        File absPath = new File(appContext.getFilesDir(), filepath);
        OutputStream os = new BufferedOutputStream(new FileOutputStream(absPath), 256);
        int r;
        while ((r = is.read()) != -1) {
            os.write(r);
        }
        os.flush();

        is.close();
        os.close();
    }
}
