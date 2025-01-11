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

import sys
import unittest
import math

from _cobra import Cobra, CobraError
from _util import *
from test_util import *


class CobraTestCase(unittest.TestCase):

    def setUp(self):
        self._cobra = Cobra(access_key=sys.argv[1], library_path=pv_library_path('../..'))

    def tearDown(self):
        self._cobra.delete()

    def test_process(self):
        audio = read_wav_file(
            os.path.join(os.path.dirname(__file__), '../../res/audio/sample.wav'),
            self._cobra.sample_rate)

        num_frames = len(audio) // self._cobra.frame_length
        probs = [ 0.0 ] * num_frames
        for i in range(num_frames):
            frame = audio[i * self._cobra.frame_length:(i + 1) * self._cobra.frame_length]
            probs[i] = self._cobra.process(frame)

        labels = [ 0 ] * num_frames
        labels[10:28] = [ 1 ] * 18

        loss = sum([ l * math.log(p) + (1 - l) * math.log(1 - p) for l, p in zip(labels, probs)]) / num_frames
        self.assertLess(loss, 0.1)

    def test_version(self):
        self.assertIsInstance(self._cobra.version, str)

    def test_message_stack(self):
        relative_path = '../..'

        error = None
        try:
            c = Cobra(access_key="invalid", library_path=pv_library_path(relative_path))
            self.assertIsNone(c)
        except CobraError as e:
            error = e.message_stack

        self.assertIsNotNone(error)
        self.assertGreater(len(error), 0)

        try:
            c = Cobra(access_key="invalid", library_path=pv_library_path(relative_path))
            self.assertIsNone(c)
        except CobraError as e:
            self.assertEqual(len(error), len(e.message_stack))
            self.assertListEqual(list(error), list(e.message_stack))

    def test_process_message_stack(self):
        relative_path = '../..'

        c = Cobra(access_key=sys.argv[1], library_path=pv_library_path(relative_path))
        test_pcm = [0] * c.frame_length

        address = c._handle
        c._handle = None

        try:
            res = c.process(test_pcm)
            self.assertTrue(res == -1)
        except CobraError as e:
            self.assertGreater(len(e.message_stack), 0)
            self.assertLess(len(e.message_stack), 8)

        c._handle = address


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("usage: test_cobra.py ${AccessKey}")
        exit(1)

    unittest.main(argv=sys.argv[:1])
