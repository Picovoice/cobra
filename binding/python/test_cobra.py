#
# Copyright 2021-2025 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import os
import sys
import unittest
from parameterized import parameterized
import math

from _cobra import Cobra, CobraError
from _util import *
from test_util import *


def get_test_devices():
    result = list()

    device = sys.argv[2] if len(sys.argv) == 3 else None
    if device == "cpu":
        max_threads = os.cpu_count() // 2
        i = 1

        while i <= max_threads:
            result.append(f"cpu:{i}")
            i *= 2
    else:
        result.append(device)

    return result


class CobraTestCase(unittest.TestCase):

    def setUp(self):
        self._access_key = sys.argv[1]
        self._device = sys.argv[2]

    def tearDown(self):
        pass

    @parameterized.expand(get_test_devices, skip_on_empty=True)
    def test_process(self, device):
        cobra = Cobra(access_key=self._access_key, device=device, library_path=pv_library_path('../..'))
        audio = read_wav_file(
            os.path.join(os.path.dirname(__file__), '../../res/audio/sample.wav'),
            cobra.sample_rate)

        num_frames = len(audio) // cobra.frame_length
        probs = [0.0] * num_frames
        for i in range(num_frames):
            frame = audio[i * cobra.frame_length:(i + 1) * cobra.frame_length]
            probs[i] = cobra.process(frame)

        labels = [0] * num_frames
        labels[28:53] = [1] * 25
        labels[97:121] = [1] * 24
        labels[163:183] = [1] * 20
        labels[227:252] = [1] * 25

        loss = - sum([label * math.log(prob) + (1 - label) * math.log(1 - prob)
                      for label, prob in zip(labels, probs)]) / num_frames
        self.assertLess(loss, 0.1)

    def test_version(self):
        cobra = Cobra(access_key=self._access_key, device=self._device, library_path=pv_library_path('../..'))
        self.assertIsInstance(cobra.version, str)

    def test_message_stack(self):
        relative_path = '../..'

        error = None
        try:
            c = Cobra(access_key="invalid", device=self._device, library_path=pv_library_path(relative_path))
            self.assertIsNone(c)
        except CobraError as e:
            error = e.message_stack

        self.assertIsNotNone(error)
        self.assertGreater(len(error), 0)

        try:
            c = Cobra(access_key="invalid", device=self._device, library_path=pv_library_path(relative_path))
            self.assertIsNone(c)
        except CobraError as e:
            self.assertEqual(len(error), len(e.message_stack))
            self.assertListEqual(list(error), list(e.message_stack))

    def test_process_message_stack(self):
        relative_path = '../..'

        c = Cobra(access_key=self._access_key, device=self._device, library_path=pv_library_path(relative_path))
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
    if len(sys.argv) != 3:
        print("usage: test_cobra.py ${AccessKey} ${Device}")
        exit(1)

    unittest.main(argv=sys.argv[:1])
