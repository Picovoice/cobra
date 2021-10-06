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
import numpy as np
import pvcobra
import pyaudio
import soundfile
import struct
import sys
from datetime import datetime
from threading import Thread


class CobraDemo(Thread):
    """
    Microphone Demo for Cobra voice activity detection engine. It creates an input audio stream from a microphone, monitors it, and
    upon detecting voice activities prints the detection time on console. It optionally saves
    the recorded audio into a file for further debugging.
    """

    def __init__(
            self,
            library_path,
            access_key,
            output_path=None,
            input_device_index=None):
        """
        Constructor.

        :param library_path: Absolute path to Cobra's dynamic library.
        :param output_path: If provided recorded audio will be stored in this location at the end of the run.
        :param input_device_index: Optional argument. If provided, audio is recorded from this input device. Otherwise,
        the default audio input device is used.
        """

        super(CobraDemo, self).__init__()

        self._library_path = library_path
        self._access_key = access_key
        self._input_device_index = input_device_index
        self._output_path = output_path
        if self._output_path is not None:
            self._recorded_frames = []

    def run(self):
        """
         Creates an input audio stream, instantiates an instance of Cobra object, and monitors the audio stream for
         voice activities. It prints the time of detection.
         """

        cobra = None
        pa = None
        audio_stream = None
        try:
            cobra = pvcobra.create(
                library_path=self._library_path, access_key=self._access_key)
            print("Cobra version: %s" % cobra.version)
            pa = pyaudio.PyAudio()

            audio_stream = pa.open(
                rate=cobra.sample_rate,
                channels=1,
                format=pyaudio.paInt16,
                input=True,
                frames_per_buffer=cobra.frame_length,
                input_device_index=self._input_device_index)

            print("Listening...")
            while True:
                pcm = audio_stream.read(cobra.frame_length)
                pcm = struct.unpack_from("h" * cobra.frame_length, pcm)

                if self._output_path is not None:
                    self._recorded_frames.append(pcm)

                voice_probability = cobra.process(pcm)
                percentage = voice_probability * 100
                bar_length = int((percentage / 10) * 3)
                empty_length = 30 - bar_length
                sys.stdout.write("\r[%3d]|%s%s|" % (
                    percentage, '█' * bar_length, ' ' * empty_length))
                sys.stdout.flush()

        except KeyboardInterrupt:
            print('Stopping ...')
        finally:
            if cobra is not None:
                cobra.delete()

            if audio_stream is not None:
                audio_stream.close()

            if pa is not None:
                pa.terminate()

            if self._output_path is not None and len(self._recorded_frames) > 0:
                recorded_audio = np.concatenate(
                    self._recorded_frames, axis=0).astype(np.int16)
                soundfile.write(self._output_path, recorded_audio,
                                samplerate=cobra.sample_rate, subtype='PCM_16')

    @classmethod
    def show_audio_devices(cls):
        fields = ('index', 'name', 'defaultSampleRate', 'maxInputChannels')

        pa = pyaudio.PyAudio()

        for i in range(pa.get_device_count()):
            info = pa.get_device_info_by_index(i)
            print(', '.join("'%s': '%s'" % (k, str(info[k])) for k in fields))

        pa.terminate()


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        '--library_path', help='Absolute path to dynamic library.', default=pvcobra.LIBRARY_PATH)

    parser.add_argument('--access_key',
                        help='AppID provided by Picovoice Console (https://picovoice.ai/console/)',
                        required=True)

    parser.add_argument('--audio_device_index',
                        help='Index of input audio device.', type=int, default=None)

    parser.add_argument(
        '--output_path', help='Absolute path to recorded audio for debugging.', default=None)

    parser.add_argument('--show_audio_devices', action='store_true')

    args = parser.parse_args()

    if args.show_audio_devices:
        CobraDemo.show_audio_devices()
    else:
        CobraDemo(
            library_path=args.library_path,
            access_key=args.access_key,
            output_path=args.output_path,
            input_device_index=args.audio_device_index).run()


if __name__ == '__main__':
    main()
