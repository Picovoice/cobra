/*
  Copyright 2022-2025 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/* eslint camelcase: 0 */

import { Mutex } from 'async-mutex';

import {
  base64ToUint8Array,
  arrayBufferToStringAtIndex,
  isAccessKeyValid,
} from '@picovoice/web-utils';

import createModule from "./lib/pv_cobra";
import createModuleSimd from "./lib/pv_cobra_simd";

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
type pv_cobra_delete_type = (object: number) => void;
type pv_cobra_frame_length_type = () => number;
type pv_sample_rate_type = () => number;
type pv_cobra_version_type = () => number;
type pv_set_sdk_type = (sdk: number) => void;
type pv_get_error_stack_type = (messageStack: number, messageStackDepth: number) => number;
type pv_free_error_stack_type = (messageStack: number) => void;

/**
 * JavaScript/WebAssembly Binding for the Picovoice Cobra VAD engine.
 */

type CobraModule = EmscriptenModule & {
  _pv_free: (address: number) => void;

  _pv_cobra_delete: pv_cobra_delete_type;
  _pv_cobra_frame_length: pv_cobra_frame_length_type;
  _pv_sample_rate: pv_sample_rate_type;
  _pv_cobra_version: pv_cobra_version_type;

  _pv_set_sdk: pv_set_sdk_type;
  _pv_get_error_stack: pv_get_error_stack_type;
  _pv_free_error_stack: pv_free_error_stack_type;

  // em default functions
  addFunction: typeof addFunction;
  ccall: typeof ccall;
  cwrap: typeof cwrap;
}

type CobraWasmOutput = {
  module: CobraModule;
  pv_cobra_process: pv_cobra_process_type;
  objectAddress: number;
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
  private readonly _module: CobraModule;

  private readonly _pv_cobra_process: pv_cobra_process_type;

  private readonly _version: string;
  private readonly _sampleRate: number;
  private readonly _frameLength: number;

  private readonly _processMutex: Mutex;

  private readonly _objectAddress: number;
  private readonly _inputBufferAddress: number;
  private readonly _voiceProbabilityAddress: number;
  private readonly _messageStackAddressAddressAddress: number;
  private readonly _messageStackDepthAddress: number;

  private static _wasm: string;
  private static _wasmLib: string;
  private static _wasmSimd: string;
  private static _wasmSimdLib: string;
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
    this._module = handleWasm.module;

    this._pv_cobra_process = handleWasm.pv_cobra_process;

    this._version = handleWasm.version;
    this._sampleRate = handleWasm.sampleRate;
    this._frameLength = handleWasm.frameLength;

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
    return this._version;
  }

  /**
   * Get frame length.
   */
  get frameLength(): number {
    return this._frameLength;
  }

  /**
   * Get sample rate.
   */
  get sampleRate(): number {
    return this._sampleRate;
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
   * Set base64 wasm file in text format.
   * @param wasmLib Base64'd wasm file in text format.
   */
  public static setWasmLib(wasmLib: string): void {
    if (this._wasmLib === undefined) {
      this._wasmLib = wasmLib;
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
   * Set base64 SIMD wasm file in text format.
   * @param wasmSimdLib Base64'd SIMD wasm file in text format.
   */
  public static setWasmSimdLib(wasmSimdLib: string): void {
    if (this._wasmSimdLib === undefined) {
      this._wasmSimdLib = wasmSimdLib;
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
            (isSimd) ? this._wasmSimd : this._wasm,
            (isSimd) ? this._wasmSimdLib : this._wasmLib,
            (isSimd) ? createModuleSimd : createModule);
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
        if (this._module === undefined) {
          throw new CobraErrors.CobraInvalidStateError('Attempted to call Cobra process after release.');
        }

        this._module.HEAP16.set(
          pcm,
          this._inputBufferAddress / Int16Array.BYTES_PER_ELEMENT
        );

        const status = await this._pv_cobra_process(
          this._objectAddress,
          this._inputBufferAddress,
          this._voiceProbabilityAddress
        );

        if (status !== PV_STATUS_SUCCESS) {
          const messageStack = Cobra.getMessageStack(
            this._module._pv_get_error_stack,
            this._module._pv_free_error_stack,
            this._messageStackAddressAddressAddress,
            this._messageStackDepthAddress,
            this._module.HEAP32,
            this._module.HEAPU8
          );

          const error = pvStatusToException(status, "Processing failed", messageStack);
          if (this._processErrorCallback) {
            this._processErrorCallback(error);
          } else {
            // eslint-disable-next-line no-console
            console.error(error);
          }
        }

        const voiceProbability = this._module.HEAPF32[this._voiceProbabilityAddress / Float32Array.BYTES_PER_ELEMENT];

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
    if (!this._module) {
      return;
    }
    this._module._pv_cobra_delete(this._objectAddress);
    this._module._pv_free(this._messageStackAddressAddressAddress);
    this._module._pv_free(this._messageStackDepthAddress);
    this._module._pv_free(this._inputBufferAddress);
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
    wasmBase64: string,
    wasmLibBase64: string,
    createModuleFunc: any,
  ): Promise<CobraWasmOutput> {
    const blob = new Blob(
      [base64ToUint8Array(wasmLibBase64)],
      { type: 'application/javascript' }
    );
    const module: CobraModule = await createModuleFunc({
      mainScriptUrlOrBlob: blob,
      wasmBinary: base64ToUint8Array(wasmBase64),
    });

    const pv_cobra_init: pv_cobra_init_type = this.wrapAsyncFunction(
      module,
      "pv_cobra_init",
      2);
    const pv_cobra_process: pv_cobra_process_type = this.wrapAsyncFunction(
      module,
      "pv_cobra_process",
      3);

    const voiceProbabilityAddress = module._malloc(Float32Array.BYTES_PER_ELEMENT);
    if (voiceProbabilityAddress === 0) {
      throw new CobraErrors.CobraOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const objectAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (objectAddressAddress === 0) {
      throw new CobraErrors.CobraOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const accessKeyAddress = module._malloc((accessKey.length + 1) * Uint8Array.BYTES_PER_ELEMENT);
    if (accessKeyAddress === 0) {
      throw new CobraErrors.CobraOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    for (let i = 0; i < accessKey.length; i++) {
      module.HEAPU8[accessKeyAddress + i] = accessKey.charCodeAt(i);
    }
    module.HEAPU8[accessKeyAddress + accessKey.length] = 0;

    const sdkEncoded = new TextEncoder().encode(this._sdk);
    const sdkAddress = module._malloc((sdkEncoded.length + 1) * Uint8Array.BYTES_PER_ELEMENT);
    if (!sdkAddress) {
      throw new CobraErrors.CobraOutOfMemoryError('malloc failed: Cannot allocate memory');
    }
    module.HEAPU8.set(sdkEncoded, sdkAddress);
    module.HEAPU8[sdkAddress + sdkEncoded.length] = 0;
    module._pv_set_sdk(sdkAddress);
    module._pv_free(sdkAddress);

    const messageStackDepthAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (!messageStackDepthAddress) {
      throw new CobraErrors.CobraOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const messageStackAddressAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (!messageStackAddressAddressAddress) {
      throw new CobraErrors.CobraOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const status = await pv_cobra_init(accessKeyAddress, objectAddressAddress);
    module._pv_free(accessKeyAddress);

    if (status !== PV_STATUS_SUCCESS) {
      const messageStack = Cobra.getMessageStack(
        module._pv_get_error_stack,
        module._pv_free_error_stack,
        messageStackAddressAddressAddress,
        messageStackDepthAddress,
        module.HEAP32,
        module.HEAPU8,
      );

      throw pvStatusToException(status, "Initialization failed", messageStack);
    }

    const objectAddress = module.HEAP32[objectAddressAddress / Int32Array.BYTES_PER_ELEMENT];
    module._pv_free(objectAddressAddress);

    const frameLength = module._pv_cobra_frame_length();
    const sampleRate = module._pv_sample_rate();
    const versionAddress = module._pv_cobra_version();
    const version = arrayBufferToStringAtIndex(
      module.HEAPU8,
      versionAddress
    );

    const inputBufferAddress = module._malloc(frameLength * Int16Array.BYTES_PER_ELEMENT);
    if (inputBufferAddress === 0) {
      throw new CobraErrors.CobraOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    return {
      module: module,
      pv_cobra_process: pv_cobra_process,
      objectAddress: objectAddress,
      frameLength: frameLength,
      sampleRate: sampleRate,
      version: version,
      inputBufferAddress: inputBufferAddress,
      voiceProbabilityAddress: voiceProbabilityAddress,
      messageStackAddressAddressAddress: messageStackAddressAddressAddress,
      messageStackDepthAddress: messageStackDepthAddress,
    };
  }

  private static getMessageStack(
    pv_get_error_stack: pv_get_error_stack_type,
    pv_free_error_stack: pv_free_error_stack_type,
    messageStackAddressAddressAddress: number,
    messageStackDepthAddress: number,
    memoryBufferInt32: Int32Array,
    memoryBufferUint8: Uint8Array,
  ): string[] {
    const status = pv_get_error_stack(messageStackAddressAddressAddress, messageStackDepthAddress);
    if (status !== PvStatus.SUCCESS) {
      throw new Error(`Unable to get error state: ${status}`);
    }

    const messageStackAddressAddress = memoryBufferInt32[messageStackAddressAddressAddress / Int32Array.BYTES_PER_ELEMENT];

    const messageStackDepth = memoryBufferInt32[messageStackDepthAddress / Int32Array.BYTES_PER_ELEMENT];
    const messageStack: string[] = [];
    for (let i = 0; i < messageStackDepth; i++) {
      const messageStackAddress = memoryBufferInt32[(messageStackAddressAddress / Int32Array.BYTES_PER_ELEMENT) + i];
      const message = arrayBufferToStringAtIndex(memoryBufferUint8, messageStackAddress);
      messageStack.push(message);
    }

    pv_free_error_stack(messageStackAddressAddress);

    return messageStack;
  }

  private static wrapAsyncFunction(module: CobraModule, functionName: string, numArgs: number): (...args: any[]) => any {
    // @ts-ignore
    return module.cwrap(
      functionName,
      "number",
      Array(numArgs).fill("number"),
      { async: true }
    );
  }
}
