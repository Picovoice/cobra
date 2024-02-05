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

import { Cobra, CobraErrors } from '../src';
import * as fs from 'fs';
import { WaveFile } from 'wavefile';

import { getSystemLibraryPath } from '../src/platforms';

import { getAudioFile } from './test_utils';

const WAV_PATH = 'sample.wav';

const libraryPath = getSystemLibraryPath();

const ACCESS_KEY = process.argv
  .filter(x => x.startsWith('--access_key='))[0]
  .split('--access_key=')[1];

const loadPcm = (audioFile: string): Int16Array => {
  const waveFilePath = getAudioFile(audioFile);
  const waveBuffer = fs.readFileSync(waveFilePath);
  const waveAudioFile = new WaveFile(waveBuffer);

  const pcm: any = waveAudioFile.getSamples(false, Int16Array);
  return pcm;
};

const cobraProcessWaveFile = (
  engineInstance: Cobra,
  audioFile: string
): number[] => {
  const pcm = loadPcm(audioFile);

  let voiceProbabilities = [];
  for (
    let i = 0;
    i < pcm.length - engineInstance.frameLength;
    i += engineInstance.frameLength
  ) {
    const voiceProbability = engineInstance.process(
      pcm.slice(i, i + engineInstance.frameLength)
    );
    voiceProbabilities.push(voiceProbability);
  }

  return voiceProbabilities;
};

describe('successful processes', () => {
  it('testing process', () => {
    let cobraEngine = new Cobra(ACCESS_KEY);

    let probs = cobraProcessWaveFile(cobraEngine, WAV_PATH);
    const labels = [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ];

    expect(labels.length).toBe(probs.length);

    let error = 0;

    for (let i = 0; i < probs.length; i++) {
      error -=
        labels[i] * Math.log(probs[i]) +
        (1 - labels[i]) * Math.log(1 - probs[i]);
    }

    error /= probs.length;
    expect(error).toBeLessThan(0.1);

    cobraEngine.release();
  });
});

describe('Defaults', () => {
  test('Empty AccessKey', () => {
    expect(() => {
      new Cobra('');
    }).toThrow(CobraErrors.CobraInvalidArgumentError);
  });
});

describe('manual paths', () => {
  test('manual library path', () => {
    let cobraEngine = new Cobra(ACCESS_KEY, {
      libraryPath: libraryPath,
    });

    let voiceProbability = cobraProcessWaveFile(cobraEngine, WAV_PATH);

    expect(voiceProbability).toBeTruthy();
    cobraEngine.release();
  });
});

describe('error message stack', () => {
  test('message stack cleared after read', () => {
    let error: string[] = [];
    try {
      new Cobra('invalid');
    } catch (e: any) {
      error = e.messageStack;
    }

    expect(error.length).toBeGreaterThan(0);
    expect(error.length).toBeLessThanOrEqual(8);

    try {
      new Cobra('invalid');
    } catch (e: any) {
      for (let i = 0; i < error.length; i++) {
        expect(error[i]).toEqual(e.messageStack[i]);
      }
    }
  });
});
