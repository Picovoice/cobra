#
# Copyright 2022 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import sys
import time
import unittest

from cobra import Cobra
from util import *


class CobraPerformanceTestCase(unittest.TestCase):
    ACCESS_KEY = sys.argv[1]
    NUM_TEST_ITERATIONS = int(sys.argv[2])
    PERFORMANCE_THRESHOLD_SEC = float(sys.argv[3])

    def test_performance(self):
        cobra = Cobra(access_key=sys.argv[1], library_path=pv_library_path('../..'))
        audio = (
            os.path.join(os.path.dirname(__file__), '../../res/audio/sample.wav'),
            cobra.sample_rate)

        num_frames = len(audio) // cobra.frame_length

        perf_results = []
        for i in range(self.NUM_TEST_ITERATIONS):
            proc_time = 0
            for j in range(num_frames):
                frame = audio[j * cobra.frame_length:(j + 1) * cobra.frame_length]
                start = time.time()
                cobra.process(frame)
                proc_time += time.time() - start
            perf_results.append(proc_time)

        cobra.delete()

        avg_perf = sum(perf_results) / self.NUM_TEST_ITERATIONS
        print("Average performance: %s" % avg_perf)
        self.assertLess(avg_perf, self.PERFORMANCE_THRESHOLD_SEC)


if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("usage: test_cobra_perf.py ${ACCESS_KEY} ${NUM_TEST_INTERVALS} ${PERFORMANCE_THRESHOLD_SEC}")
        exit(1)

    unittest.main(argv=sys.argv[:1])
