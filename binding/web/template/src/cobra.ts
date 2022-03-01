/*
  Copyright 2018-2021 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/* eslint camelcase: 0 */

import { Mutex } from 'async-mutex';

import { CobraEngine } from '@picovoice/cobra-web-core';
import { COBRA_WASM_BASE64 } from './cobra_b64';

import { 
  aligned_alloc_type, 
  buildWasm,
  arrayBufferToStringAtIndex,
  isAccessKeyValid
} from '@picovoice/web-utils';

/**
 * WebAssembly function types
 */

 type pv_cobra_init_type = (accessKey: number, object: number) => Promise<number>;
 type pv_cobra_process_type = (object: number, buffer: number, isVoiced: number) => Promise<number>;
 type pv_cobra_delete_type = (object: number) => Promise<void>;
 type pv_status_to_string_type = (status: number) => Promise<number>
 type pv_sample_rate_type = () => Promise<number>;
 type pv_cobra_frame_length_type = () => Promise<number>;
 type pv_cobra_version_type = () => Promise<number>;

/**
 * JavaScript/WebAssembly Binding for the Picovoice Cobra voice activity detection (VAD) engine.
 *
 * It initializes the WebAssembly module and exposes an async factory method `create` for creating
 * new instances of the engine.
 *
 * The instances have JavaScript bindings that wrap the calls to the C library and
 * do some rudimentary type checking and parameter validation.
 */

type CobraWasmOutput = {
  frameLength: number;
  inputBufferAddress: number;
  memory: WebAssembly.Memory;
  objectAddress: number;
  pvCobraDelete: pv_cobra_delete_type;
  pvCobraProcess: pv_cobra_process_type;
  pvStatusToString: pv_status_to_string_type;
  sampleRate: number;
  version: string;
  voiceProbabilityAddress: number;
};

const PV_STATUS_SUCCESS = 10000;

export class Cobra implements CobraEngine {
  private _pvCobraDelete: pv_cobra_delete_type;
  private _pvCobraProcess: pv_cobra_process_type;
  private _pvStatusToString: pv_status_to_string_type;

  private _wasmMemory: WebAssembly.Memory;
  private _memoryBuffer: Int16Array;
  private _memoryBufferView: DataView;
  private _processMutex: Mutex;

  private _objectAddress: number;
  private _inputBufferAddress: number;
  private _voiceProbabilityAddress: number;

  private static _frameLength: number;
  private static _sampleRate: number;
  private static _version: string;

  private static _cobraMutex = new Mutex();

  private constructor(handleWasm: CobraWasmOutput) {
    Cobra._frameLength = handleWasm.frameLength;
    Cobra._sampleRate = handleWasm.sampleRate;
    Cobra._version = handleWasm.version;

    this._pvCobraDelete = handleWasm.pvCobraDelete;
    this._pvCobraProcess = handleWasm.pvCobraProcess;
    this._pvStatusToString = handleWasm.pvStatusToString;

    this._wasmMemory = handleWasm.memory;
    this._objectAddress = handleWasm.objectAddress;
    this._inputBufferAddress = handleWasm.inputBufferAddress;
    this._voiceProbabilityAddress = handleWasm.voiceProbabilityAddress;

    this._memoryBuffer = new Int16Array(handleWasm.memory.buffer);
    this._memoryBufferView = new DataView(handleWasm.memory.buffer);
    this._processMutex = new Mutex();
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public async release(): Promise<void> {
    await this._pvCobraDelete(this._objectAddress);
  }

  /**
   * Processes a frame of audio. The required sample rate can be retrieved from '.sampleRate' and the length
   * of frame (number of audio samples per frame) can be retrieved from '.frameLength'. The audio needs to be
   * 16-bit linearly-encoded. Furthermore, the engine operates on single-channel audio.
   *
   * @param pcm - A frame of audio with properties described above.
   * @return Probability of voice activity. It is a floating-point number within [0, 1].
   */
  public async process(pcm: Int16Array): Promise<number> {
    if (!(pcm instanceof Int16Array)) {
      throw new Error("The argument 'pcm' must be provided as an Int16Array");
    }
    const returnPromise = new Promise<number>((resolve, reject) => {
      this._processMutex
        .runExclusive(async () => {
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

          return voiceProbability;
        })
        .then((result: number) => {
          resolve(result);
        })
        .catch((error: any) => {
          reject(error);
        });
    });
    return returnPromise;
  }

  get version(): string {
    return Cobra._version;
  }

  get sampleRate(): number {
    return Cobra._sampleRate;
  }

  get frameLength(): number {
    return Cobra._frameLength;
  }

  /**
   * Creates an instance of the the Picovoice Cobra voice activity detection (VAD) engine.
   * Behind the scenes, it requires the WebAssembly code to load and initialize before
   * it can create an instance.
   *
   * @param accessKey - AccessKey
   * generated by Picovoice Console
   *
   * @returns An instance of the Cobra engine.
   */
  public static async create(accessKey: string): Promise<Cobra> {
    if (!isAccessKeyValid(accessKey)) {
      throw new Error('Invalid AccessKey');
    }
    const returnPromise = new Promise<Cobra>((resolve, reject) => {
      Cobra._cobraMutex
        .runExclusive(async () => {
          const wasmOutput = await Cobra.initWasm(accessKey.trim());
          return new Cobra(wasmOutput);
        })
        .then((result: Cobra) => {
          resolve(result);
        })
        .catch((error: any) => {
          reject(error);
        });
    });
    return returnPromise;
  }

  private static async initWasm(accessKey: string): Promise<any> {
    // A WebAssembly page has a constant size of 64KiB. -> 1MiB ~= 16 pages
    // minimum memory requirements for init: 3 pages
    const memory = new WebAssembly.Memory({ initial: 16, maximum: 64 });

    const memoryBufferUint8 = new Uint8Array(memory.buffer);

    const exports = await buildWasm(memory, COBRA_WASM_BASE64);

    const aligned_alloc = exports.aligned_alloc as aligned_alloc_type;
    const pv_cobra_version = exports.pv_cobra_version as pv_cobra_version_type;
    const pv_cobra_frame_length = exports.pv_cobra_frame_length as pv_cobra_frame_length_type;
    const pv_cobra_process = exports.pv_cobra_process as pv_cobra_process_type;
    const pv_cobra_delete = exports.pv_cobra_delete as pv_cobra_delete_type;
    const pv_cobra_init = exports.pv_cobra_init as pv_cobra_init_type;
    const pv_status_to_string = exports.pv_status_to_string as pv_status_to_string_type;
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
      throw new Error(
        `'pv_cobra_init' failed with status ${arrayBufferToStringAtIndex(
          memoryBufferUint8,
          await pv_status_to_string(status)
        )}`
      );
    }
    const memoryBufferView = new DataView(memory.buffer);
    const objectAddress = memoryBufferView.getInt32(objectAddressAddress, true);

    const sampleRate = await pv_sample_rate();
    const frameLength = await pv_cobra_frame_length();
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
      frameLength: frameLength,
      inputBufferAddress: inputBufferAddress,
      memory: memory,
      objectAddress: objectAddress,
      pvCobraDelete: pv_cobra_delete,
      pvCobraProcess: pv_cobra_process,
      pvStatusToString: pv_status_to_string,
      sampleRate: sampleRate,
      version: version,
      voiceProbabilityAddress: voiceProbabilityAddress,
    };
  }
}

export default Cobra;
