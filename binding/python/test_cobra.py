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

import sys
import unittest

import soundfile

from cobra import Cobra
from util import *


class CobraTestCase(unittest.TestCase):
    def test_process(self):
        app_id = sys.argv[1]
        cobra = Cobra(library_path=pv_library_path('../..'), app_id=app_id)
        audio, sample_rate = soundfile.read(
            os.path.join(os.path.dirname(__file__), '../../res/audio/sample.wav'),
            dtype='int16')
        assert sample_rate == cobra.sample_rate

        num_frames = len(audio) // cobra.frame_length
        results = []
        threshold = 0.8
        for i in range(num_frames):
            frame = audio[i * cobra.frame_length:(i + 1) * cobra.frame_length]
            voice_probability = cobra.process(frame)
            if voice_probability >= threshold:
                results.append(voice_probability)

        cobra.delete()
        voice_probability_ref = [0.880, 0.881, 0.992, 0.999, 0.999, 0.999, 0.999, 0.999, 0.999, 0.999, 0.999, 0.999,
                                 0.999, 0.999, 0.999, 0.999, 0.997, 0.978, 0.901]
        self.assertEqual(len(voice_probability_ref), len(results))
        error = [voice_probability_ref[results.index(result)] - result for result in results]
        self.assertLess(max(abs(e) for e in error), 0.001)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("usage: test_cobra.py ${APP_ID}")
        exit(1)

    # remove our args from the call to unittest main
    unittest.main(argv=sys.argv[:1])
