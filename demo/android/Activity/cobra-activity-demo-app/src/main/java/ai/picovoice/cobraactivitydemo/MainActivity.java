/*
    Copyright 2021-2023 Picovoice Inc.

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
import android.os.Bundle;
import android.os.CountDownTimer;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;
import android.widget.ToggleButton;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import ai.picovoice.android.voiceprocessor.VoiceProcessor;
import ai.picovoice.android.voiceprocessor.VoiceProcessorException;
import ai.picovoice.cobra.Cobra;
import ai.picovoice.cobra.CobraActivationException;
import ai.picovoice.cobra.CobraActivationLimitException;
import ai.picovoice.cobra.CobraActivationRefusedException;
import ai.picovoice.cobra.CobraActivationThrottledException;
import ai.picovoice.cobra.CobraException;
import ai.picovoice.cobra.CobraInvalidArgumentException;

public class MainActivity extends AppCompatActivity {
    private static final String ACCESS_KEY = "${YOUR_ACCESS_KEY_HERE}";

    private final VoiceProcessor voiceProcessor = VoiceProcessor.getInstance();

    private Cobra cobra;

    private ToggleButton recordButton;
    private TextView detectedText;
    private Needle needleView;

    private CountDownTimer visibilityTimer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.cobra_activity_demo);

        recordButton = findViewById(R.id.startButton);
        needleView = findViewById(R.id.needle);
        detectedText = findViewById(R.id.detectedText);

        visibilityTimer = new CountDownTimer(750, 750) {
            @Override
            public void onTick(long l) {
                detectedText.setVisibility(View.VISIBLE);
            }

            @Override
            public void onFinish() {
                detectedText.setVisibility(View.INVISIBLE);
            }
        };

        try {
            cobra = new Cobra(ACCESS_KEY);
        } catch (CobraInvalidArgumentException e) {
            onCobraInitError(String.format("AccessKey '%s' is invalid", ACCESS_KEY));
        } catch (CobraActivationException e) {
            onCobraInitError("AccessKey activation error");
        } catch (CobraActivationLimitException e) {
            onCobraInitError("AccessKey reached its device limit");
        } catch (CobraActivationRefusedException e) {
            onCobraInitError("AccessKey refused");
        } catch (CobraActivationThrottledException e) {
            onCobraInitError("AccessKey has been throttled");
        } catch (CobraException e) {
            onCobraInitError("Failed to initialize Cobra " + e.getMessage());
        }

        voiceProcessor.addFrameListener(frame -> {
            try {
                final float voiceProbability = cobra.process(frame);
                runOnUiThread(() -> {
                    needleView.setValue(voiceProbability);
                    if (needleView.isDetected()) {
                        visibilityTimer.cancel();
                        visibilityTimer.start();
                    }
                });
            } catch (CobraException e) {
                runOnUiThread(() -> displayError(e.toString()));
            }
        });

        voiceProcessor.addErrorListener(error -> {
            runOnUiThread(() -> displayError(error.toString()));
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        cobra.delete();
    }

    private void onCobraInitError(String error) {
        TextView errorMessage = findViewById(R.id.errorMessage);
        errorMessage.setText(error);
        errorMessage.setVisibility(View.VISIBLE);

        recordButton.setEnabled(false);
        recordButton.setBackground(ContextCompat.getDrawable(this, R.drawable.button_disabled));
    }

    private void displayError(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }

    private void requestRecordPermission() {
        ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, 0);
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            @NonNull String[] permissions,
            @NonNull int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (grantResults.length == 0 || grantResults[0] == PackageManager.PERMISSION_DENIED) {
            ToggleButton toggleButton = findViewById(R.id.startButton);
            toggleButton.toggle();
        } else {
            try {
                voiceProcessor.start(cobra.getFrameLength(), cobra.getSampleRate());
            } catch (VoiceProcessorException e) {
                displayError(e.toString());
            }
        }
    }

    public void onClick(View view) {
        try {
            if (recordButton.isChecked()) {
                if (voiceProcessor.hasRecordAudioPermission(this)) {
                    voiceProcessor.start(cobra.getFrameLength(), cobra.getSampleRate());
                } else {
                    requestRecordPermission();
                }
            } else {
                voiceProcessor.stop();
            }
        } catch (VoiceProcessorException e) {
            displayError(e.getMessage());
        }
    }
}
