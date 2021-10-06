#
# Copyright 2021 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import argparse

import pvcobra
import soundfile


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument('--input_audio_path', help='Absolute path to input audio file.', required=True)

    parser.add_argument('--library_path', help='Absolute path to dynamic library.', default=pvcobra.LIBRARY_PATH)

    parser.add_argument('--access_key',
                        help='AccessKey provided by Picovoice Console (https://picovoice.ai/console/)',
                        required=True)

    parser.add_argument('--threshold', help="Threshold for the probability of voice activity",
                        type=float,
                        default=0.8)

    args = parser.parse_args()

    cobra = pvcobra.create(library_path=args.library_path, access_key=args.access_key)
    print("Cobra version: %s" % cobra.version)
    audio, sample_rate = soundfile.read(args.input_audio_path, dtype='int16')
    if audio.ndim == 2:
        print("Cobra processes single-channel audio, but stereo file was provided. Processing left channel only.")
        audio = audio[0, :]
    if sample_rate != cobra.sample_rate:
        raise ValueError("Audio file should have a sample rate of %d. got %d" % (cobra.sample_rate, sample_rate))

    num_frames = len(audio) // cobra.frame_length
    for i in range(num_frames):
        frame = audio[i * cobra.frame_length:(i + 1) * cobra.frame_length]
        result = cobra.process(frame)
        if result >= args.threshold:
            print("Detected voice activity at %0.1f sec" % (float(i * cobra.frame_length) / float(cobra.sample_rate)))

    cobra.delete()


if __name__ == '__main__':
    main()
