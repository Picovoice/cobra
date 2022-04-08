#
# Copyright 2021-2022 Picovoice Inc.
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

import numpy as np

from cobra import Cobra
from test_util import *
from util import *


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
        probs = np.zeros(num_frames, dtype=float)
        for i in range(num_frames):
            frame = audio[i * self._cobra.frame_length:(i + 1) * self._cobra.frame_length]
            probs[i] = self._cobra.process(frame)

        labels = np.zeros(num_frames, dtype=int)
        labels[10:28] = 1

        loss = -np.sum(labels * np.log(probs) + (1 - labels) * np.log(1 - probs)) / num_frames
        self.assertLess(loss, 0.1)

    def test_version(self):
        self.assertIsInstance(self._cobra.version, str)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("usage: test_cobra.py ${AccessKey}")
        exit(1)

    unittest.main(argv=sys.argv[:1])
