/*
    Copyright 2021-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/


package ai.picovoice.cobra.testapp;

import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ListView;
import android.widget.SimpleAdapter;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

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
import java.util.HashMap;

import ai.picovoice.cobra.Cobra;
import ai.picovoice.cobra.CobraException;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
    }

    @Override
    protected void onStop() {
        super.onStop();
    }

    public void startTest(View view) {
        Button testButton = findViewById(R.id.testButton);
        testButton.setBackground(ContextCompat.getDrawable(
                getApplicationContext(),
                R.drawable.button_disabled));
        runTest();

        testButton.setBackground(ContextCompat.getDrawable(
                getApplicationContext(),
                R.drawable.button_background));
    }

    public void runTest() {
        String accessKey = getApplicationContext().getString(R.string.pvTestingAccessKey);

        ArrayList<TestResult> results = new ArrayList<>();

        TestResult result = new TestResult();
        result.testName = "Test Init";
        Cobra cobra = null;
        try {
            cobra = new Cobra(accessKey);
            result.success = true;
        } catch (CobraException e) {
            result.success = false;
            result.errorMessage = String.format("Failed to init cobra with '%s'", e);
        } finally {
            results.add(result);
        }

        result = new TestResult();
        result.testName = "Test Process";
        try {
            String audioPath = "audio/sample.wav";

            ArrayList<Float> processResult = processTestAudio(cobra, audioPath);
            double sum = 0;
            for (float f : processResult) {
                sum += f;
            }
            if (processResult.size() > 0 && sum >= 0) {
                result.success = true;
            } else {
                result.success = false;
                result.errorMessage = "Process returned invalid result.";
            }
        } catch (Exception e) {
            result.success = false;
            result.errorMessage = String.format("Failed to process with '%s'", e);
        } finally {
            results.add(result);
        }

        result = new TestResult();
        result.testName = "Test Exception";
        try {
            new Cobra("");
            result.success = false;
            result.errorMessage = "Init should have throw an exception";
        } catch (CobraException e) {
            result.success = true;
        } finally {
            results.add(result);
        }

        displayTestResults(results);
    }

    private void displayTestResults(ArrayList<TestResult> results) {
        ListView resultList = findViewById(R.id.resultList);

        int passed = 0;
        int failed = 0;

        ArrayList<HashMap<String, String>> list = new ArrayList<>();
        for (TestResult result : results) {
            HashMap<String, String> map = new HashMap<>();
            map.put("testName", result.testName);

            String message;
            if (result.success) {
                message = "Test Passed";
                passed += 1;
            } else {
                message = String.format("Test Failed: %s", result.errorMessage);
                failed += 1;
            }

            map.put("testMessage", message);
            list.add(map);
        }

        SimpleAdapter adapter = new SimpleAdapter(
                getApplicationContext(),
                list,
                R.layout.list_view,
                new String[]{"testName", "testMessage"},
                new int[]{R.id.testName, R.id.testMessage});

        resultList.setAdapter(adapter);

        TextView passedView = findViewById(R.id.testNumPassed);
        TextView failedView = findViewById(R.id.testNumFailed);

        passedView.setText(String.valueOf(passed));
        failedView.setText(String.valueOf(failed));

        TextView resultView = findViewById(R.id.testResult);
        if (passed == 0 || failed > 0) {
            resultView.setText("Failed");
        } else {
            resultView.setText("Passed");
        }
    }

    private ArrayList<Float> processTestAudio(@NonNull Cobra c, String audioPath) throws Exception {
        File testAudio = new File(getApplicationContext().getFilesDir(), audioPath);

        if (!testAudio.exists()) {
            testAudio.getParentFile().mkdirs();
            extractFile(audioPath);
        }

        FileInputStream audioInputStream = new FileInputStream(testAudio);

        byte[] rawData = new byte[c.getFrameLength() * 2];
        short[] pcm = new short[c.getFrameLength()];
        ByteBuffer pcmBuff = ByteBuffer.wrap(rawData).order(ByteOrder.LITTLE_ENDIAN);

        audioInputStream.skip(44);

        ArrayList<Float> vadResults = new ArrayList<>();
        while (audioInputStream.available() > 0) {
            int numRead = audioInputStream.read(pcmBuff.array());
            if (numRead == c.getFrameLength() * 2) {
                pcmBuff.asShortBuffer().get(pcm);
                float vad = c.process(pcm);
                vadResults.add(vad);
            }
        }
        return vadResults;
    }

    private void extractFile(String filepath) throws IOException {
        System.out.println(filepath);
        InputStream is = new BufferedInputStream(getAssets().open(filepath), 256);
        File absPath = new File(getApplicationContext().getFilesDir(), filepath);
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
