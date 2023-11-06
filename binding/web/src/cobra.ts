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
import { CobraOptions, PvStatus } from './types';
import * as CobraErrors from "./cobra_errors";
import { pvStatusToException } from './cobra_errors';

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
type pv_cobra_frame_length_type = () => Promise<number>;
type pv_sample_rate_type = () => Promise<number>;
type pv_cobra_version_type = () => Promise<number>;
type pv_set_sdk_type = (sdk: number) => Promise<void>;
type pv_get_error_stack_type = (messageStack: number, messageStackDepth: number) => Promise<number>;
type pv_free_error_stack_type = (messageStack: number) => Promise<void>;

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
  pvGetErrorStack: pv_get_error_stack_type;
  pvFreeErrorStack: pv_free_error_stack_type;
  frameLength: number;
  sampleRate: number;
  version: string;
  inputBufferAddress: number;
  voiceProbabilityAddress: number;
  messageStackAddressAddressAddress: number;
  messageStackDepthAddress: number;
};

const PV_STATUS_SUCCESS = 10000;

export class Cobra {
  private readonly _pvCobraDelete: pv_cobra_delete_type;
  private readonly _pvCobraProcess: pv_cobra_process_type;
  private readonly _pvGetErrorStack: pv_get_error_stack_type;
  private readonly _pvFreeErrorStack: pv_free_error_stack_type;

  private _wasmMemory: WebAssembly.Memory | undefined;
  private readonly _pvFree: pv_free_type;
  private readonly _processMutex: Mutex;

  private readonly _objectAddress: number;
  private readonly _inputBufferAddress: number;
  private readonly _voiceProbabilityAddress: number;
  private readonly _messageStackAddressAddressAddress: number;
  private readonly _messageStackDepthAddress: number;

  private static _frameLength: number;
  private static _sampleRate: number;
  private static _version: string;
  private static _wasm: string;
  private static _wasmSimd: string;
  private static _sdk: string = "web";

  private static _cobraMutex = new Mutex();

  private readonly _voiceProbabilityCallback: (
    voiceProbability: number
  ) => void;
  private readonly _processErrorCallback?: (error: CobraErrors.CobraError) => void;

  private constructor(
    handleWasm: CobraWasmOutput,
    voiceProbabilityCallback: (voiceProbability: number) => void,
    processErrorCallback?: (error: CobraErrors.CobraError) => void
  ) {
    Cobra._frameLength = handleWasm.frameLength;
    Cobra._sampleRate = handleWasm.sampleRate;
    Cobra._version = handleWasm.version;

    this._pvCobraDelete = handleWasm.pvCobraDelete;
    this._pvCobraProcess = handleWasm.pvCobraProcess;
    this._pvGetErrorStack = handleWasm.pvGetErrorStack;
    this._pvFreeErrorStack = handleWasm.pvFreeErrorStack;

    this._wasmMemory = handleWasm.memory;
    this._pvFree = handleWasm.pvFree;
    this._objectAddress = handleWasm.objectAddress;
    this._inputBufferAddress = handleWasm.inputBufferAddress;
    this._voiceProbabilityAddress = handleWasm.voiceProbabilityAddress;
    this._messageStackAddressAddressAddress = handleWasm.messageStackAddressAddressAddress;
    this._messageStackDepthAddress = handleWasm.messageStackDepthAddress;

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

  public static setSdk(sdk: string): void {
    Cobra._sdk = sdk;
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
      throw new CobraErrors.CobraInvalidArgumentError('Invalid AccessKey');
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
      const error = new CobraErrors.CobraInvalidArgumentError(
        "The argument 'pcm' must be provided as an Int16Array"
      );
      if (this._processErrorCallback) {
        this._processErrorCallback(error);
      } else {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }

    this._processMutex
      .runExclusive(async () => {
        if (this._wasmMemory === undefined) {
          throw new CobraErrors.CobraInvalidStateError('Attempted to call Cobra process after release.');
        }

        const memoryBuffer = new Int16Array(this._wasmMemory.buffer);

        memoryBuffer.set(
          pcm,
          this._inputBufferAddress / Int16Array.BYTES_PER_ELEMENT
        );

        const status = await this._pvCobraProcess(
          this._objectAddress,
          this._inputBufferAddress,
          this._voiceProbabilityAddress
        );

        const memoryBufferUint8 = new Uint8Array(this._wasmMemory.buffer);
        const memoryBufferView = new DataView(this._wasmMemory.buffer);

        if (status !== PV_STATUS_SUCCESS) {
          const messageStack = await Cobra.getMessageStack(
            this._pvGetErrorStack,
            this._pvFreeErrorStack,
            this._messageStackAddressAddressAddress,
            this._messageStackDepthAddress,
            memoryBufferView,
            memoryBufferUint8
          );

          const error = pvStatusToException(status, "Processing failed", messageStack);
          if (this._processErrorCallback) {
            this._processErrorCallback(error);
          } else {
            // eslint-disable-next-line no-console
            console.error(error);
          }
        }

        const voiceProbability = memoryBufferView.getFloat32(
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
    await this._pvFree(this._messageStackAddressAddressAddress);
    await this._pvFree(this._messageStackDepthAddress);
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
    const pv_cobra_frame_length =
      exports.pv_cobra_frame_length as pv_cobra_frame_length_type;
    const pv_sample_rate = exports.pv_sample_rate as pv_sample_rate_type;
    const pv_set_sdk = exports.pv_set_sdk as pv_set_sdk_type;
    const pv_get_error_stack = exports.pv_get_error_stack as pv_get_error_stack_type;
    const pv_free_error_stack = exports.pv_free_error_stack as pv_free_error_stack_type;

    const voiceProbabilityAddress = await aligned_alloc(
      Float32Array.BYTES_PER_ELEMENT,
      Float32Array.BYTES_PER_ELEMENT
    );
    if (voiceProbabilityAddress === 0) {
      throw new CobraErrors.CobraOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const objectAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (objectAddressAddress === 0) {
      throw new CobraErrors.CobraOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const accessKeyAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (accessKey.length + 1) * Uint8Array.BYTES_PER_ELEMENT
    );

    if (accessKeyAddress === 0) {
      throw new CobraErrors.CobraOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    for (let i = 0; i < accessKey.length; i++) {
      memoryBufferUint8[accessKeyAddress + i] = accessKey.charCodeAt(i);
    }
    memoryBufferUint8[accessKeyAddress + accessKey.length] = 0;

    const sdkEncoded = new TextEncoder().encode(this._sdk);
    const sdkAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (sdkEncoded.length + 1) * Uint8Array.BYTES_PER_ELEMENT
    );
    if (!sdkAddress) {
      throw new CobraErrors.CobraOutOfMemoryError('malloc failed: Cannot allocate memory');
    }
    memoryBufferUint8.set(sdkEncoded, sdkAddress);
    memoryBufferUint8[sdkAddress + sdkEncoded.length] = 0;
    await pv_set_sdk(sdkAddress);

    const messageStackDepthAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (!messageStackDepthAddress) {
      throw new CobraErrors.CobraOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const messageStackAddressAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (!messageStackAddressAddressAddress) {
      throw new CobraErrors.CobraOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const status = await pv_cobra_init(accessKeyAddress, objectAddressAddress);

    await pv_free(accessKeyAddress);
    const memoryBufferView = new DataView(memory.buffer);

    if (status !== PV_STATUS_SUCCESS) {
      const messageStack = await Cobra.getMessageStack(
        pv_get_error_stack,
        pv_free_error_stack,
        messageStackAddressAddressAddress,
        messageStackDepthAddress,
        memoryBufferView,
        memoryBufferUint8
      );

      throw pvStatusToException(status, "Initialization failed", messageStack, pvError);
    }

    const objectAddress = memoryBufferView.getInt32(objectAddressAddress, true);
    await pv_free(objectAddressAddress);

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
      throw new CobraErrors.CobraOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    return {
      aligned_alloc,
      memory: memory,
      pvFree: pv_free,
      objectAddress: objectAddress,
      pvCobraDelete: pv_cobra_delete,
      pvCobraProcess: pv_cobra_process,
      pvGetErrorStack: pv_get_error_stack,
      pvFreeErrorStack: pv_free_error_stack,
      frameLength: frameLength,
      sampleRate: sampleRate,
      version: version,
      inputBufferAddress: inputBufferAddress,
      voiceProbabilityAddress: voiceProbabilityAddress,
      messageStackAddressAddressAddress: messageStackAddressAddressAddress,
      messageStackDepthAddress: messageStackDepthAddress,
    };
  }

  private static async getMessageStack(
    pv_get_error_stack: pv_get_error_stack_type,
    pv_free_error_stack: pv_free_error_stack_type,
    messageStackAddressAddressAddress: number,
    messageStackDepthAddress: number,
    memoryBufferView: DataView,
    memoryBufferUint8: Uint8Array,
  ): Promise<string[]> {
    const status = await pv_get_error_stack(messageStackAddressAddressAddress, messageStackDepthAddress);
    if (status !== PvStatus.SUCCESS) {
      throw pvStatusToException(status, "Unable to get Cobra error state");
    }

    const messageStackAddressAddress = memoryBufferView.getInt32(messageStackAddressAddressAddress, true);

    const messageStackDepth = memoryBufferView.getInt32(messageStackDepthAddress, true);
    const messageStack: string[] = [];
    for (let i = 0; i < messageStackDepth; i++) {
      const messageStackAddress = memoryBufferView.getInt32(
        messageStackAddressAddress + (i * Int32Array.BYTES_PER_ELEMENT), true);
      const message = arrayBufferToStringAtIndex(memoryBufferUint8, messageStackAddress);
      messageStack.push(message);
    }

    await pv_free_error_stack(messageStackAddressAddress);

    return messageStack;
  }
}
