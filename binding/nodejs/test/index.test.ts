//
// Copyright 2024-2025 Picovoice Inc.
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

const DEVICE = process.argv
  .filter(x => x.startsWith('--device='))[0]
  ?.split('--device=')[1] ?? 'best';

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
    const cobraEngine = new Cobra(ACCESS_KEY, { device: DEVICE });

    const probs = cobraProcessWaveFile(cobraEngine, WAV_PATH);

    const pcm = loadPcm(WAV_PATH);
    const numSamples = Math.floor(pcm.length / cobraEngine.frameLength);
    const labels = new Array(numSamples).fill(0);

    labels.fill(1, 28, 53);
    labels.fill(1, 97, 121);
    labels.fill(1, 163, 183);
    labels.fill(1, 227, 252);

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
      new Cobra('', { device: DEVICE });
    }).toThrow(CobraErrors.CobraInvalidArgumentError);
  });

  test('Invalid Device', () => {
    expect(() => {
      new Cobra(ACCESS_KEY, { device: 'invalid' });
    }).toThrow(CobraErrors.CobraInvalidArgumentError);
  });
});

describe('manual paths', () => {
  test('manual library path', () => {
    let cobraEngine = new Cobra(ACCESS_KEY, {
      device: DEVICE,
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
      new Cobra('invalid', { device: DEVICE });
    } catch (e: any) {
      error = e.messageStack;
    }

    expect(error.length).toBeGreaterThan(0);
    expect(error.length).toBeLessThanOrEqual(8);

    try {
      new Cobra('invalid', { device: DEVICE });
    } catch (e: any) {
      for (let i = 0; i < error.length; i++) {
        expect(error[i]).toEqual(e.messageStack[i]);
      }
    }
  });
});

describe('list hardware devices', () => {
  test('listHardwareDevices returns array', () => {
    const devices = Cobra.listHardwareDevices();

    expect(Array.isArray(devices)).toBe(true);
    expect(devices.length).toBeGreaterThan(0);

    for (const device of devices) {
      expect(typeof device).toBe('string');
    }
  });
});
