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

import * as fs from 'fs';
import * as assert from 'assert';

import PvStatus from './pv_status_t';

import {
  CobraInvalidArgumentError,
  CobraInvalidStateError,
  pvStatusToException,
} from './errors';

import { CobraOptions } from './types';

import { getSystemLibraryPath } from './platforms';

type CobraHandleAndStatus = { handle: any; status: PvStatus };
type VoiceProbabilityAndStatus = {
  is_voiced: number;
  status: PvStatus;
};

/**
 * Node.js binding for Cobra voice activity detection engine
 *
 * Performs the calls to the Cobra node library. Does some basic parameter validation to prevent
 * errors occurring in the library layer. Provides clearer error messages in native JavaScript.
 */
export default class Cobra {
  private _pvCobra: any;
  private _handle: any;

  private readonly _version: string;
  private readonly _frameLength: number;
  private readonly _sampleRate: number;

  /**
   * Creates an instance of Cobra.
   * @param {string} accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
   * @param options Optional configuration arguments.
   * @param {string} options.libraryPath the path to the Cobra library (.node extension)
   */
  constructor(accessKey: string, options: CobraOptions = {}) {
    assert(typeof accessKey === 'string');
    if (
      accessKey === null ||
      accessKey === undefined ||
      accessKey.length === 0
    ) {
      throw new CobraInvalidArgumentError(`No AccessKey provided to Cobra`);
    }

    const { libraryPath = getSystemLibraryPath() } = options;

    if (!fs.existsSync(libraryPath)) {
      throw new CobraInvalidArgumentError(
        `File not found at 'libraryPath': ${libraryPath}`
      );
    }

    const pvCobra = require(libraryPath); // eslint-disable-line
    this._pvCobra = pvCobra;

    let cobraHandleAndStatus: CobraHandleAndStatus | null = null;
    try {
      pvCobra.set_sdk('nodejs');

      cobraHandleAndStatus = pvCobra.init(accessKey);
    } catch (err: any) {
      pvStatusToException(PvStatus[err.code as keyof typeof PvStatus], err);
    }

    const status = cobraHandleAndStatus!.status;
    if (status !== PvStatus.SUCCESS) {
      this.handlePvStatus(status, 'Cobra failed to initialize');
    }

    this._handle = cobraHandleAndStatus!.handle;
    this._sampleRate = pvCobra.sample_rate();
    this._frameLength = pvCobra.frame_length();
    this._version = pvCobra.version();
  }

  /**
   * @returns number of audio samples per frame (i.e. the length of the array provided to the process function)
   * @see {@link process}
   */
  get frameLength(): number {
    return this._frameLength;
  }

  /**
   * @returns the audio sampling rate accepted by the process function
   * @see {@link process}
   */
  get sampleRate(): number {
    return this._sampleRate;
  }

  /**
   * @returns the version of the Cobra engine
   */
  get version(): string {
    return this._version;
  }

  /**
   * Processes a frame of audio and returns the voice probability result.
   *
   * @param {Int16Array} pcm Audio data. The audio needs to have a sample rate equal to `Cobra.sampleRate` and be 16-bit linearly-encoded.
   * The specific array length can be attained by calling `Cobra.frameLength`. This function operates on single-channel audio.
   * @returns {number} Voice probability result.
   */
  process(pcm: Int16Array): number {
    assert(pcm instanceof Int16Array);

    if (
      this._handle === 0 ||
      this._handle === null ||
      this._handle === undefined
    ) {
      throw new CobraInvalidStateError('Cobra is not initialized');
    }

    if (pcm === undefined || pcm === null) {
      throw new CobraInvalidArgumentError(
        `PCM array provided to 'Cobra.process()' is undefined or null`
      );
    } else if (pcm.length !== this.frameLength) {
      throw new CobraInvalidArgumentError(
        `Size of frame array provided to 'Cobra.process()' (${pcm.length}) does not match the engine 'Cobra.frameLength' (${this.frameLength})`
      );
    }

    let VoiceProbabilityAndStatus: VoiceProbabilityAndStatus | null = null;
    try {
      VoiceProbabilityAndStatus = this._pvCobra.process(this._handle, pcm);
    } catch (err: any) {
      pvStatusToException(PvStatus[err.code as keyof typeof PvStatus], err);
    }

    const status = VoiceProbabilityAndStatus!.status;
    if (status !== PvStatus.SUCCESS) {
      this.handlePvStatus(status, 'Cobra failed to process the audio frame');
    }

    return VoiceProbabilityAndStatus!.is_voiced;
  }

  /**
   * Releases the resources acquired by Cobra.
   *
   * Be sure to call this when finished with the instance
   * to reclaim the memory that was allocated by the C library.
   */
  release(): void {
    if (this._handle !== 0) {
      this._pvCobra.delete(this._handle);
      this._handle = 0;
    } else {
      // eslint-disable-next-line no-console
      console.warn('Cobra is not initialized; nothing to destroy');
    }
  }

  private handlePvStatus(status: PvStatus, message: string): void {
    const errorObject = this._pvCobra.get_error_stack();
    if (errorObject.status === PvStatus.SUCCESS) {
      pvStatusToException(status, message, errorObject.message_stack);
    } else {
      pvStatusToException(status, 'Unable to get Cobra error state');
    }
  }
}
