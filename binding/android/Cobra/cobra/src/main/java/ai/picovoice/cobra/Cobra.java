/*
    Copyright 2021-2025 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/


package ai.picovoice.cobra;

import android.content.Context;

/**
 *   Android binding for Cobra voice activity detection (VAD) engine. It detects speech signals
 *   within an incoming stream of audio in real-time. It processes incoming audio in consecutive
 *   frames and for each frame emits the probability of voice activity. The number of samples per
 *   frame can be attained by calling {@link #getFrameLength()}. The incoming audio needs to have a
 *   sample rate equal to {@link #getSampleRate()} and be 16-bit linearly-encoded. Cobra operates on
 *   single-channel audio.
 **/
public class Cobra {

    private static String _sdk = "android";

    static {
        System.loadLibrary("pv_cobra");
    }

    private long handle;

    public static void setSdk(String sdk) {
        Cobra._sdk = sdk;
    }

    /**
     * Constructor.
     *
     * @param accessKey AccessKey obtained from Picovoice Console
     * @param device String representation of the device (e.g., CPU or GPU) to use for inference.
     *               If set to `best`, the most suitable device is selected automatically. If set to `gpu`,
     *               the engine uses the first available GPU device. To select a specific GPU device, set this
     *               argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the index of the target GPU. If
     *               set to `cpu`, the engine will run on the CPU with the default number of threads. To specify
     *               the number of threads, set this argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}`
     *               is the desired number of threads.
     * @throws CobraException if there is an error while initializing Cobra.
     */
    private Cobra(String accessKey, String device) throws CobraException {
        CobraNative.setSdk(Cobra._sdk);
        handle = CobraNative.init(accessKey, device);
    }

    /**
     * Releases resources acquired by Cobra.
     */
    public void delete() {
        if (handle != 0) {
            CobraNative.delete(handle);
            handle = 0;
        }
    }

    /**
     * Processes a frame of the incoming audio stream and emits the detection result.
     *
     * @param pcm A frame of audio samples. The number of samples per frame can be attained by
     *            calling {@link #getFrameLength()}. The incoming audio needs to have a sample rate
     *            equal to {@link #getSampleRate()} and be 16-bit linearly-encoded. Furthermore,
     *            Cobra operates on single channel audio only.
     * @return Probability of voice activity. It is a floating-point number within [0, 1].
     * @throws CobraException if there is an error while processing the audio frame.
     */
    public float process(short[] pcm) throws CobraException {
        if (handle == 0) {
            throw new CobraInvalidStateException("Attempted to call Cobra process after delete.");
        }
        if (pcm == null) {
            throw new CobraInvalidArgumentException("Passed null frame to Cobra process.");
        }

        if (pcm.length != getFrameLength()) {
            throw new CobraInvalidArgumentException(
                    String.format("Cobra process requires frames of length %d. " +
                            "Received frame of size %d.", getFrameLength(), pcm.length));
        }
        return CobraNative.process(handle, pcm);
    }

    /**
     * Getter for required number of audio samples per frame.
     *
     * @return Required number of audio samples per frame.
     */
    public int getFrameLength() {
        return CobraNative.getFrameLength();
    }

    /**
     * Getter for required audio sample rate.
     *
     * @return Required audio sample rate.
     */
    public int getSampleRate() {
        return CobraNative.getSampleRate();
    }

    /**
     * Getter for Cobra version.
     *
     * @return Cobra version.
     */
    public String getVersion() {
        return CobraNative.getVersion();
    }

    /**
     * Lists all available devices that Cobra can use for inference.
     * Each entry in the list can be used as the `device` argument when initializing Cobra.
     *
     * @return Array of all available devices that Cobra can be used for inference.
     * @throws CobraException if getting available devices fails.
     */
    public static String[] getAvailableDevices() throws CobraException {
        return CobraNative.listHardwareDevices();
    }

    /**
     * Builder for creating an instance of Cobra with a mixture of default arguments.
     */
    public static class Builder {

        private String accessKey = null;
        private String device = "best";

        /**
         * Setter the AccessKey.
         *
         * @param accessKey AccessKey obtained from Picovoice Console
         */
        public Builder setAccessKey(String accessKey) {
            this.accessKey = accessKey;
            return this;
        }

        /**
         * Setter for the device string.
         *
         * @param device String representation of the device (e.g., CPU or GPU) to use for inference.
         *               If set to `best`, the most suitable device is selected automatically. If set to `gpu`,
         *               the engine uses the first available GPU device. To select a specific GPU device, set this
         *               argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the index of the target GPU. If
         *               set to `cpu`, the engine will run on the CPU with the default number of threads. To specify
         *               the number of threads, set this argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}`
         *               is the desired number of threads.
         */
        public Builder setDevice(String device) {
            this.device = device;
            return this;
        }

        /**
         * Validates properties and creates an instance of the Cobra voice activity detection engine.
         *
         * @param context Android application context
         * @return An instance of Cobra Engine
         * @throws CobraException if there is an error while initializing Cobra.
         */
        public Cobra build(Context context) throws CobraException {
            if (accessKey == null || this.accessKey.equals("")) {
                throw new CobraInvalidArgumentException("No AccessKey was provided to Cobra");
            }

            if (device == null || this.device.equals("")) {
                throw new CobraInvalidArgumentException("Device must not be null or empty");
            }

            return new Cobra(
                    accessKey,
                    device);
        }
    }

}
