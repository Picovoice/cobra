/*
    Copyright 2021 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.cobraactivitydemo;

import android.content.Context;
import android.content.res.AssetManager;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.microsoft.appcenter.espresso.Factory;
import com.microsoft.appcenter.espresso.ReportHelper;

import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
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

import ai.picovoice.cobra.Cobra;
import ai.picovoice.cobra.CobraException;

import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;


@RunWith(AndroidJUnit4.class)
public class CobraTest {

    @Rule
    public ReportHelper reportHelper = Factory.getReportHelper();
    Context testContext;
    Context appContext;
    AssetManager assetManager;
    String testResourcesPath;

    String appID = "";

    @After
    public void TearDown() {
        reportHelper.label("Stopping App");
    }

    @Before
    public void Setup() throws IOException {
        testContext = InstrumentationRegistry.getInstrumentation().getContext();
        appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assetManager = testContext.getAssets();
        extractAssetsRecursively("test_resources");
        testResourcesPath = new File(appContext.getFilesDir(), "test_resources").getAbsolutePath();

        // appID = appContext.getString(R.string.appID);
    }

    @Test
    public void testProcess() throws CobraException {
        Cobra cobra = new Cobra(appID);

        File testAudio = new File(testResourcesPath, "audio_samples/sample.wav");
        ArrayList<Float> detectionResults = new ArrayList<>();

        try {
            FileInputStream audioInputStream = new FileInputStream(testAudio);

            byte[] rawData = new byte[cobra.getFrameLength() * 2];
            short[] pcm = new short[cobra.getFrameLength()];
            ByteBuffer pcmBuff = ByteBuffer.wrap(rawData).order(ByteOrder.LITTLE_ENDIAN);

            audioInputStream.skip(44);

            float threshold = 0.8f;
            while (audioInputStream.available() > 0) {
                int numRead = audioInputStream.read(pcmBuff.array());
                if (numRead == cobra.getFrameLength() * 2) {
                    pcmBuff.asShortBuffer().get(pcm);
                    float voiceProbability = cobra.process(pcm);
                    if (voiceProbability >= threshold) {
                        detectionResults.add(voiceProbability);
                    }
                }
            }
        } catch (Exception e){
            throw new CobraException(e);
        }

        cobra.delete();

        float[] voiceProbabilityRef = {
            0.880f, 0.881f, 0.992f, 0.999f, 0.999f,
            0.999f, 0.999f, 0.999f, 0.999f, 0.999f,
            0.999f, 0.999f, 0.999f, 0.999f, 0.999f,
            0.999f, 0.997f, 0.978f, 0.901f
        };

        assertSame(voiceProbabilityRef.length, detectionResults.size());
        for (int i = 0; i < voiceProbabilityRef.length; i++) {
            float error = voiceProbabilityRef[i] - detectionResults.get(i);
            assertTrue(Math.abs(error) < 0.001);
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
