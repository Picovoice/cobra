/*
    Copyright 2021-2022 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/


package ai.picovoice.cobra;

/**
 *   Android binding for Cobra voice activity detection (VAD) engine. It detects speech signals
 *   within an incoming stream of audio in real-time. It processes incoming audio in consecutive
 *   frames and for each frame emits the probability of voice activity. The number of samples per
 *   frame can be attained by calling {@link #getFrameLength()}. The incoming audio needs to have a
 *   sample rate equal to {@link #getSampleRate()} and be 16-bit linearly-encoded. Cobra operates on
 *   single-channel audio.
 **/
public class Cobra {

    static {
        System.loadLibrary("pv_cobra");
    }

    private long handle;

    /**
     * Constructor.
     *
     * @param accessKey AccessKey obtained from Picovoice Console
     * @throws CobraException if there is an error while initializing Cobra.
     */
    public Cobra(String accessKey) throws CobraException {
        handle = CobraNative.init(accessKey);
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

}
