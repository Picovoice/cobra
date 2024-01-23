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
const EXPECTED_VOICE_PROBABILITY_SCORES = [
  0.00350041501224041, 0.017226237803697586, 0.022328782826662064,
  0.024964014068245888, 0.017900168895721436, 0.028114058077335358,
  0.1203354075551033, 0.11426965147256851, 0.0626743733882904,
  0.028843538835644722, 0.9569169282913208, 0.9879112839698792,
  0.9837538003921509, 0.9286680221557617, 0.9479621648788452,
  0.9499486684799194, 0.9634374976158142, 0.9786311388015747,
  0.9836912155151367, 0.9827406406402588, 0.9849273562431335,
  0.9784052968025208, 0.9812748432159424, 0.9742639660835266,
  0.9664738178253174, 0.9518184661865234, 0.9407353401184082, 0.814495861530304,
  0.118283212184906, 0.01206541433930397, 0.014447852969169617,
  0.015830140560865402, 0.012734980322420597, 0.01062167901545763,
  0.010828903876245022, 0.00736008258536458, 0.014871003106236458,
  0.00925009697675705, 0.009878940880298615, 0.008195844478905201,
  0.008736720308661461, 0.01084984466433525,
];

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

    let res = cobraProcessWaveFile(cobraEngine, WAV_PATH);

    res.forEach((voiceProbabilityScore, i) => {
      expect(voiceProbabilityScore).toBeCloseTo(
        EXPECTED_VOICE_PROBABILITY_SCORES[i],
        3
      );
    });

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
