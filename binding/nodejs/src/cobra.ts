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
type HardwareDevicesAndStatus = {
  hardware_devices: string[];
  num_hardware_devices: number;
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
   * @param {string} device String representation of the device (e.g., CPU or GPU) to use.
   *   If set to `best`, the most suitable device is selected automatically.
   *   If set to `gpu`, the engine uses the first available GPU device.
   *   To select a specific GPU device, set this argument to `gpu:${GPU_INDEX}`.
   *   If set to `cpu`, the engine will run on the CPU with the default number of threads.
   *   To specify the number of threads, set this argument to `cpu:${NUM_THREADS}`.
   * @param options Optional configuration arguments.
   * @param {string} options.libraryPath the path to the Cobra library (.node extension)
   */
  constructor(accessKey: string, device: string, options: CobraOptions = {}) {
    assert(typeof accessKey === 'string');
    if (
      accessKey === null ||
      accessKey === undefined ||
      accessKey.length === 0
    ) {
      throw new CobraInvalidArgumentError(`No AccessKey provided to Cobra`);
    }

    if (
      typeof device !== 'string' ||
      device === null ||
      device === undefined ||
      device.length === 0
    ) {
      throw new CobraInvalidArgumentError(
        `'device' should be a non-empty string`
      );
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

      cobraHandleAndStatus = pvCobra.init(accessKey, device);
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
   * @returns {number} Probability of voice activity. It is a floating-point number within [0, 1].
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

    let voiceProbabilityAndStatus: VoiceProbabilityAndStatus | null = null;
    try {
      voiceProbabilityAndStatus = this._pvCobra.process(this._handle, pcm);
    } catch (err: any) {
      pvStatusToException(PvStatus[err.code as keyof typeof PvStatus], err);
    }

    const status = voiceProbabilityAndStatus!.status;
    if (status !== PvStatus.SUCCESS) {
      this.handlePvStatus(status, 'Cobra failed to process the audio frame');
    }

    return voiceProbabilityAndStatus!.is_voiced;
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
    }
  }

  /**
   * Lists all available devices that Cobra can use for inference.
   * Each entry in the list can be used as the `device` argument when initializing Cobra.
   *
   * @returns {string[]} Array of all available devices that Cobra can use for inference.
   */
  listHardwareDevices(): string[] {
    if (
      this._handle === 0 ||
      this._handle === null ||
      this._handle === undefined
    ) {
      throw new CobraInvalidStateError('Cobra is not initialized');
    }

    let hardwareDevicesAndStatus: HardwareDevicesAndStatus | null = null;
    try {
      hardwareDevicesAndStatus = this._pvCobra.list_hardware_devices();
    } catch (err: any) {
      pvStatusToException(PvStatus[err.code as keyof typeof PvStatus], err);
    }

    const status = hardwareDevicesAndStatus!.status;
    if (status !== PvStatus.SUCCESS) {
      this.handlePvStatus(status, 'Cobra failed to list hardware devices');
    }

    return hardwareDevicesAndStatus!.hardware_devices;
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
