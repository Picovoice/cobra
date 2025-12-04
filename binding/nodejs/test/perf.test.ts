//
// Copyright 2024 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
'use strict';

import { Cobra, getInt16Frames } from '../src';
import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';

import { WaveFile } from 'wavefile';

const WAV_PATH = '../../../res/audio/sample.wav';

const ACCESS_KEY =
  process.argv
    .filter(x => x.startsWith('--access_key='))[0]
    ?.split('--access_key=')[1] ?? '';

const DEVICE = process.argv
  .filter(x => x.startsWith('--device='))[0]
  ?.split('--device=')[1] ?? 'cpu:1';

const NUM_TEST_ITERATIONS = Number(
  process.argv
    .filter(x => x.startsWith('--num_test_iterations='))[0]
    ?.split('--num_test_iterations=')[1] ?? 0
);

const PROC_PERFORMANCE_THRESHOLD_SEC = Number(
  process.argv
    .filter(x => x.startsWith('--proc_performance_threshold_sec='))[0]
    ?.split('--proc_performance_threshold_sec=')[1] ?? 0
);

describe('Performance', () => {
  test('proc performance', () => {
    let cobraEngine = new Cobra(ACCESS_KEY, DEVICE);

    const waveFilePath = path.join(__dirname, WAV_PATH);
    const waveBuffer = fs.readFileSync(waveFilePath);
    const waveAudioFile = new WaveFile(waveBuffer);
    const frames = getInt16Frames(waveAudioFile, cobraEngine.frameLength);

    let perfResults = [];
    for (let i = 0; i < NUM_TEST_ITERATIONS; i++) {
      let totalProcTime = 0;
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const before = performance.now();
        cobraEngine.process(frame);
        totalProcTime += performance.now() - before;
      }

      if (i > 0) {
        perfResults.push(totalProcTime);
      }
    }
    cobraEngine.release();

    let avgPerfMs =
      perfResults.reduce((acc, a) => acc + a, 0) / NUM_TEST_ITERATIONS;
    let avgPerfSec = Number((avgPerfMs / 1000).toFixed(3));
    // eslint-disable-next-line no-console
    console.log('Average proc performance: ' + avgPerfSec);
    expect(avgPerfSec).toBeLessThanOrEqual(PROC_PERFORMANCE_THRESHOLD_SEC);
  });
});
