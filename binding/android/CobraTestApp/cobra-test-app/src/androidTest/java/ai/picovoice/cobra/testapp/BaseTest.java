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
import java.util.HashSet;
import java.util.Set;

import ai.picovoice.cobra.Cobra;
import ai.picovoice.cobra.CobraException;

import static org.junit.Assert.*;


@RunWith(AndroidJUnit4.class)
public class BaseTest {
    static Set<String> extractedFiles = new HashSet<>();
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
        testResourcesPath = new File(appContext.getFilesDir(), "test_resources").getAbsolutePath();

        accessKey = appContext.getString(R.string.pvTestingAccessKey);
    }

    @Test
    public void testProcess() throws CobraException, IOException {
        Cobra cobra = new Cobra(accessKey);

        File testAudio = new File(getAudioFilepath("sample.wav"));

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
    
    public String getAudioFilepath(String audioFilename) throws IOException {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        String resPath = new File(
                context.getFilesDir(),
                "test_resources").getAbsolutePath();
        extractTestFile(String.format("test_resources/audio/%s", audioFilename));
        return new File(resPath, String.format("audio/%s", audioFilename)).getAbsolutePath();
    }

    private void extractTestFile(String filepath) throws IOException {
        File absPath = new File(
                appContext.getFilesDir(),
                filepath);

        if (extractedFiles.contains(filepath)) {
            return;
        }

        if (!absPath.exists()) {
            if (absPath.getParentFile() != null) {
                absPath.getParentFile().mkdirs();
            }
            absPath.createNewFile();
        }

        InputStream is = new BufferedInputStream(
                assetManager.open(filepath),
                256);
        OutputStream os = new BufferedOutputStream(
                new FileOutputStream(absPath),
                256);

        int r;
        while ((r = is.read()) != -1) {
            os.write(r);
        }
        os.flush();

        is.close();
        os.close();

        extractedFiles.add(filepath);
    }
}
