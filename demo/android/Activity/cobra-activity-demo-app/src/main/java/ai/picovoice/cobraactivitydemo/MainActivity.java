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

import android.Manifest;
import android.content.pm.PackageManager;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Bundle;
import android.os.Process;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;
import android.widget.ToggleButton;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

import ai.picovoice.cobra.Cobra;
import ai.picovoice.cobra.CobraException;

public class MainActivity extends AppCompatActivity {
    private final MicrophoneReader microphoneReader = new MicrophoneReader();
    public Cobra cobra;

    private static final String ACCESS_KEY = "${YOUR_ACCESS_KEY_HERE}";

    private ToggleButton recordButton;
    private Analog analogView;
    private TextView detectedText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.cobra_activity_demo);

        recordButton = findViewById(R.id.startButton);
        TextView errorMessage = findViewById(R.id.errorMessage);
        analogView = findViewById(R.id.analog);
        detectedText = findViewById(R.id.detectedText);

        try {
            cobra = new Cobra(ACCESS_KEY);
        } catch (CobraException e) {
            String error;

            if (e.getMessage() == null) {
                error = "Failed to initialize Cobra.";
            } else if (e.getMessage().contains("IllegalArgument")) {
                error = "AccessKey provided is invalid.";
            } else if (e.getMessage().contains("ACTIVATION_ERROR")) {
                error = "AccessKey activation error.";
            } else if (e.getMessage().contains("ACTIVATION_LIMIT_REACHED")) {
                error = "AccessKey reached its limit.";
            } else if (e.getMessage().contains("ACTIVATION_REFUSED")) {
                error = "AccessKey activation refused.";
            } else if (e.getMessage().contains("ACTIVATION_THROTTLED")) {
                error = "AccessKey is throttled.";
            } else {
                error = "Failed to initialize Cobra: " + e.getMessage();
            }

            errorMessage.setText(error);
            errorMessage.setVisibility(View.VISIBLE);

            recordButton.setEnabled(false);
            recordButton.setBackground(ContextCompat.getDrawable(this, R.drawable.button_disabled));
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        cobra.delete();
    }

    private void displayError(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }

    private boolean hasRecordPermission() {
        return ActivityCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestRecordPermission() {
        ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, 0);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (grantResults.length == 0 || grantResults[0] == PackageManager.PERMISSION_DENIED) {
            ToggleButton toggleButton = findViewById(R.id.startButton);
            toggleButton.toggle();
        } else {
            microphoneReader.start();
        }
    }

    public void onClick(View view) {
        try {
            if (recordButton.isChecked()) {
                if (hasRecordPermission()) {
                    microphoneReader.start();
                } else {
                    requestRecordPermission();
                }
            } else {
                microphoneReader.stop();
                analogView.reset();
            }
        } catch (InterruptedException e) {
            displayError("Audio stop command interrupted\n" + e.getMessage());
        }
    }

    private class MicrophoneReader {
        private final AtomicBoolean started = new AtomicBoolean(false);
        private final AtomicBoolean stop = new AtomicBoolean(false);
        private final AtomicBoolean stopped = new AtomicBoolean(false);

        void start() {

            if (started.get()) {
                return;
            }

            started.set(true);

            Executors.newSingleThreadExecutor().submit((Callable<Void>) () -> {
                Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO);
                read();
                return null;
            });
        }

        void stop() throws InterruptedException {
            if (!started.get()) {
                return;
            }

            stop.set(true);

            while (!stopped.get()) {
                Thread.sleep(10);
            }

            started.set(false);
            stop.set(false);
            stopped.set(false);
        }

        private void read() throws CobraException {
            final int minBufferSize = AudioRecord.getMinBufferSize(
                    cobra.getSampleRate(),
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT);
            final int bufferSize = Math.max(cobra.getSampleRate() / 2, minBufferSize);

            AudioRecord audioRecord = null;

            short[] buffer = new short[cobra.getFrameLength()];

            try {
                audioRecord = new AudioRecord(
                        MediaRecorder.AudioSource.MIC,
                        cobra.getSampleRate(),
                        AudioFormat.CHANNEL_IN_MONO,
                        AudioFormat.ENCODING_PCM_16BIT,
                        bufferSize);
                audioRecord.startRecording();

                while (!stop.get()) {
                    if (audioRecord.read(buffer, 0, buffer.length) == buffer.length) {
                        final float voiceProbability = cobra.process(buffer);
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                analogView.setValue(voiceProbability);
                                detectedText.setVisibility((analogView.isDetected()) ? View.VISIBLE : View.INVISIBLE);
                                analogView.invalidate();
                            }
                        });
                    }
                }

                audioRecord.stop();
            } catch (IllegalArgumentException | IllegalStateException e) {
                throw new CobraException(e);
            } finally {
                if (audioRecord != null) {
                    audioRecord.release();
                }

                stopped.set(true);
            }
        }
    }
}
