#
# Copyright 2021-2023 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import argparse
import struct
import wave

import pvcobra


def read_file(file_name, sample_rate):
    wav_file = wave.open(file_name, mode="rb")
    channels = wav_file.getnchannels()
    num_frames = wav_file.getnframes()

    if wav_file.getframerate() != sample_rate:
        raise ValueError("Audio file should have a sample rate of %d. got %d" % (sample_rate, wav_file.getframerate()))

    samples = wav_file.readframes(num_frames)
    wav_file.close()

    frames = struct.unpack('h' * num_frames * channels, samples)

    if channels == 2:
        print("Picovoice processes single-channel audio but stereo file is provided. Processing left channel only.")

    return frames[::channels]


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        '--input_wav_path',
        help='Absolute path to input audio file.',
        required=True)

    parser.add_argument(
        '--library_path',
        help='Absolute path to dynamic library. Default: using the library provided by `pvcobra`')

    parser.add_argument(
        '--access_key',
        help='AccessKey provided by Picovoice Console (https://console.picovoice.ai/)',
        required=True)

    parser.add_argument(
        '--threshold',
        help="Threshold for the probability of voice activity",
        type=float,
        default=0.8)

    args = parser.parse_args()

    try:
        cobra = pvcobra.create(access_key=args.access_key, library_path=args.library_path)
    except pvcobra.CobraInvalidArgumentError as e:
        print(e)
        raise e
    except pvcobra.CobraActivationError as e:
        print("AccessKey activation error")
        raise e
    except pvcobra.CobraActivationLimitError as e:
        print("AccessKey '%s' has reached it's temporary device limit" % args.access_key)
        raise e
    except pvcobra.CobraActivationRefusedError as e:
        print("AccessKey '%s' refused" % args.access_key)
        raise e
    except pvcobra.CobraActivationThrottledError as e:
        print("AccessKey '%s' has been throttled" % args.access_key)
        raise e
    except pvcobra.CobraError as e:
        print("Failed to initialize Cobra")
        raise e

    print("Cobra version: %s" % cobra.version)
    audio = read_file(args.input_wav_path, cobra.sample_rate)

    num_frames = len(audio) // cobra.frame_length
    for i in range(num_frames):
        frame = audio[i * cobra.frame_length:(i + 1) * cobra.frame_length]
        result = cobra.process(frame)
        if result >= args.threshold:
            print("Detected voice activity at %0.1f sec" % (float(i * cobra.frame_length) / float(cobra.sample_rate)))

    cobra.delete()


if __name__ == '__main__':
    main()
