/*
  Copyright 2022-2023 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/* eslint camelcase: 0 */

import { Mutex } from 'async-mutex';

import {
  aligned_alloc_type,
  arrayBufferToStringAtIndex,
  buildWasm,
  isAccessKeyValid,
  pv_free_type,
  PvError
} from '@picovoice/web-utils';

import { simd } from 'wasm-feature-detect';
import { CobraOptions } from './types';

/**
 * WebAssembly function types
 */

type pv_cobra_init_type = (
  accessKey: number,
  object: number
) => Promise<number>;
type pv_cobra_process_type = (
  object: number,
  pcm: number,
  voiceProbability: number
) => Promise<number>;
type pv_cobra_delete_type = (object: number) => Promise<void>;
type pv_status_to_string_type = (status: number) => Promise<number>;
type pv_cobra_frame_length_type = () => Promise<number>;
type pv_sample_rate_type = () => Promise<number>;
type pv_cobra_version_type = () => Promise<number>;

/**
 * JavaScript/WebAssembly Binding for the Picovoice Cobra VAD engine.
 */

type CobraWasmOutput = {
  aligned_alloc: aligned_alloc_type;
  memory: WebAssembly.Memory;
  pvFree: pv_free_type;
  objectAddress: number;
  pvCobraDelete: pv_cobra_delete_type;
  pvCobraProcess: pv_cobra_process_type;
  pvStatusToString: pv_status_to_string_type;
  frameLength: number;
  sampleRate: number;
  version: string;
  inputBufferAddress: number;
  voiceProbabilityAddress: number;
};

const PV_STATUS_SUCCESS = 10000;

export class Cobra {
  private readonly _pvCobraDelete: pv_cobra_delete_type;
  private readonly _pvCobraProcess: pv_cobra_process_type;
  private readonly _pvStatusToString: pv_status_to_string_type;

  private _wasmMemory: WebAssembly.Memory | undefined;
  private readonly _pvFree: pv_free_type;
  private readonly _memoryBuffer: Int16Array;
  private readonly _memoryBufferUint8: Uint8Array;
  private readonly _memoryBufferView: DataView;
  private readonly _processMutex: Mutex;

  private readonly _objectAddress: number;
  private readonly _inputBufferAddress: number;
  private readonly _alignedAlloc: CallableFunction;
  private readonly _voiceProbabilityAddress: number;

  private static _frameLength: number;
  private static _sampleRate: number;
  private static _version: string;
  private static _wasm: string;
  private static _wasmSimd: string;

  private static _cobraMutex = new Mutex();

  private readonly _voiceProbabilityCallback: (
    voiceProbability: number
  ) => void;
  private readonly _processErrorCallback?: (error: string) => void;

  private constructor(
    handleWasm: CobraWasmOutput,
    voiceProbabilityCallback: (voiceProbability: number) => void,
    processErrorCallback?: (error: string) => void
  ) {
    Cobra._frameLength = handleWasm.frameLength;
    Cobra._sampleRate = handleWasm.sampleRate;
    Cobra._version = handleWasm.version;

    this._pvCobraDelete = handleWasm.pvCobraDelete;
    this._pvCobraProcess = handleWasm.pvCobraProcess;
    this._pvStatusToString = handleWasm.pvStatusToString;

    this._wasmMemory = handleWasm.memory;
    this._pvFree = handleWasm.pvFree;
    this._objectAddress = handleWasm.objectAddress;
    this._inputBufferAddress = handleWasm.inputBufferAddress;
    this._alignedAlloc = handleWasm.aligned_alloc;
    this._voiceProbabilityAddress = handleWasm.voiceProbabilityAddress;

    this._memoryBuffer = new Int16Array(handleWasm.memory.buffer);
    this._memoryBufferUint8 = new Uint8Array(handleWasm.memory.buffer);
    this._memoryBufferView = new DataView(handleWasm.memory.buffer);
    this._processMutex = new Mutex();

    this._voiceProbabilityCallback = voiceProbabilityCallback;
    this._processErrorCallback = processErrorCallback;
  }

  /**
   * Get Cobra engine version.
   */
  get version(): string {
    return Cobra._version;
  }

  /**
   * Get frame length.
   */
  get frameLength(): number {
    return Cobra._frameLength;
  }

  /**
   * Get sample rate.
   */
  get sampleRate(): number {
    return Cobra._sampleRate;
  }

  /**
   * Set base64 wasm file.
   * @param wasm Base64'd wasm file to use to initialize wasm.
   */
  public static setWasm(wasm: string): void {
    if (this._wasm === undefined) {
      this._wasm = wasm;
    }
  }

  /**
   * Set base64 wasm file with SIMD feature.
   * @param wasmSimd Base64'd wasm file to use to initialize wasm.
   */
  public static setWasmSimd(wasmSimd: string): void {
    if (this._wasmSimd === undefined) {
      this._wasmSimd = wasmSimd;
    }
  }

  /**
   * Creates an instance of the Picovoice Cobra VAD engine.
   * Behind the scenes, it requires the WebAssembly code to load and initialize before
   * it can create an instance.
   *
   * @param accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
   * @param voiceProbabilityCallback User-defined callback to run after receiving voice probability result.
   * @param options Optional configuration arguments.
   * @param options.processErrorCallback User-defined callback invoked if any error happens while processing audio.
   *
   * @returns An instance of the Cobra engine.
   */
  public static async create(
    accessKey: string,
    voiceProbabilityCallback: (voiceProbability: number) => void,
    options: CobraOptions = {}
  ): Promise<Cobra> {
    const { processErrorCallback } = options;

    if (!isAccessKeyValid(accessKey)) {
      throw new Error('Invalid AccessKey');
    }

    return new Promise<Cobra>((resolve, reject) => {
      Cobra._cobraMutex
        .runExclusive(async () => {
          const isSimd = await simd();
          const wasmOutput = await Cobra.initWasm(
            accessKey.trim(),
            isSimd ? this._wasmSimd : this._wasm
          );
          return new Cobra(
            wasmOutput,
            voiceProbabilityCallback,
            processErrorCallback
          );
        })
        .then((result: Cobra) => {
          resolve(result);
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  }

  /**
   * Processes a frame of audio. The number of samples per frame can be attained by calling
   * '.frameLength'. The incoming audio needs to have a sample rate equal to '.sampleRate' and be 16-bit
   * linearly-encoded. Cobra operates on single-channel audio. Calls user-defined `voiceProbabilityCallback` when a
   * result has been obtained from Cobra.
   *
   * @param pcm A frame of audio with properties described above.
   */
  public async process(pcm: Int16Array): Promise<void> {
    if (!(pcm instanceof Int16Array)) {
      const error = new Error(
        "The argument 'pcm' must be provided as an Int16Array"
      );
      if (this._processErrorCallback) {
        this._processErrorCallback(error.toString());
      } else {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }

    this._processMutex
      .runExclusive(async () => {
        if (this._wasmMemory === undefined) {
          throw new Error('Attempted to call Cobra process after release.');
        }

        this._memoryBuffer.set(
          pcm,
          this._inputBufferAddress / Int16Array.BYTES_PER_ELEMENT
        );

        const status = await this._pvCobraProcess(
          this._objectAddress,
          this._inputBufferAddress,
          this._voiceProbabilityAddress
        );
        if (status !== PV_STATUS_SUCCESS) {
          const memoryBuffer = new Uint8Array(this._wasmMemory.buffer);
          throw new Error(
            `process failed with status ${arrayBufferToStringAtIndex(
              memoryBuffer,
              await this._pvStatusToString(status)
            )}`
          );
        }

        const voiceProbability = this._memoryBufferView.getFloat32(
          this._voiceProbabilityAddress,
          true
        );

        this._voiceProbabilityCallback(voiceProbability);
      })
      .catch((error: any) => {
        if (this._processErrorCallback) {
          this._processErrorCallback(error.toString());
        } else {
          // eslint-disable-next-line no-console
          console.error(error);
        }
      });
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public async release(): Promise<void> {
    await this._pvCobraDelete(this._objectAddress);
    await this._pvFree(this._inputBufferAddress);
    delete this._wasmMemory;
    this._wasmMemory = undefined;
  }

  async onmessage(e: MessageEvent): Promise<void> {
    switch (e.data.command) {
      case 'process':
        await this.process(e.data.inputFrame);
        break;
      default:
        // eslint-disable-next-line no-console
        console.warn(`Unrecognized command: ${e.data.command}`);
    }
  }

  private static async initWasm(
    accessKey: string,
    wasmBase64: string
  ): Promise<any> {
    // A WebAssembly page has a constant size of 64KiB. -> 1MiB ~= 16 pages
    // minimum memory requirements for init: 3 pages
    const memory = new WebAssembly.Memory({ initial: 16, maximum: 64 });

    const memoryBufferUint8 = new Uint8Array(memory.buffer);

    const pvError = new PvError();

    const exports = await buildWasm(memory, wasmBase64, pvError);

    const aligned_alloc = exports.aligned_alloc as aligned_alloc_type;
    const pv_free = exports.pv_free as pv_free_type;
    const pv_cobra_version = exports.pv_cobra_version as pv_cobra_version_type;
    const pv_cobra_process = exports.pv_cobra_process as pv_cobra_process_type;
    const pv_cobra_delete = exports.pv_cobra_delete as pv_cobra_delete_type;
    const pv_cobra_init = exports.pv_cobra_init as pv_cobra_init_type;
    const pv_status_to_string =
      exports.pv_status_to_string as pv_status_to_string_type;
    const pv_cobra_frame_length =
      exports.pv_cobra_frame_length as pv_cobra_frame_length_type;
    const pv_sample_rate = exports.pv_sample_rate as pv_sample_rate_type;

    const voiceProbabilityAddress = await aligned_alloc(
      Float32Array.BYTES_PER_ELEMENT,
      Float32Array.BYTES_PER_ELEMENT
    );
    if (voiceProbabilityAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const objectAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (objectAddressAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const accessKeyAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (accessKey.length + 1) * Uint8Array.BYTES_PER_ELEMENT
    );

    if (accessKeyAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    for (let i = 0; i < accessKey.length; i++) {
      memoryBufferUint8[accessKeyAddress + i] = accessKey.charCodeAt(i);
    }
    memoryBufferUint8[accessKeyAddress + accessKey.length] = 0;

    const status = await pv_cobra_init(accessKeyAddress, objectAddressAddress);
    if (status !== PV_STATUS_SUCCESS) {
      const msg = `'pv_cobra_init' failed with status ${arrayBufferToStringAtIndex(
        memoryBufferUint8,
        await pv_status_to_string(status)
      )}`;

      throw new Error(
        `${msg}\nDetails: ${pvError.getErrorString()}`
      );
    }
    const memoryBufferView = new DataView(memory.buffer);
    const objectAddress = memoryBufferView.getInt32(objectAddressAddress, true);

    const frameLength = await pv_cobra_frame_length();
    const sampleRate = await pv_sample_rate();
    const versionAddress = await pv_cobra_version();
    const version = arrayBufferToStringAtIndex(
      memoryBufferUint8,
      versionAddress
    );

    const inputBufferAddress = await aligned_alloc(
      Int16Array.BYTES_PER_ELEMENT,
      frameLength * Int16Array.BYTES_PER_ELEMENT
    );
    if (inputBufferAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    return {
      aligned_alloc,
      memory: memory,
      pvFree: pv_free,
      objectAddress: objectAddress,
      pvCobraDelete: pv_cobra_delete,
      pvCobraProcess: pv_cobra_process,
      pvStatusToString: pv_status_to_string,
      frameLength: frameLength,
      sampleRate: sampleRate,
      version: version,
      inputBufferAddress: inputBufferAddress,
      voiceProbabilityAddress: voiceProbabilityAddress,
    };
  }
}
