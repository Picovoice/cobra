/*
  Copyright 2018-2021 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/* eslint camelcase: 0 */


import * as Asyncify from 'asyncify-wasm';
import { Mutex } from 'async-mutex';

import { CobraEngine } from './cobra_types';
import { COBRA_WASM_BASE64 } from './cobra_b64';
import { wasiSnapshotPreview1Emulator } from './wasi_snapshot';

import {
  arrayBufferToBase64AtIndex,
  arrayBufferToStringAtIndex,
  base64ToUint8Array,
  fetchWithTimeout,
  getPvStorage,
  isAccessKeyValid,
  stringHeaderToObject,
} from './utils';

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
  pvCobraDelete: CallableFunction;
  pvCobraProcess: CallableFunction;
  pvStatusToString: CallableFunction;
  sampleRate: number;
  version: string;
  voiceProbabilityAddress: number;
};

const PV_STATUS_SUCCESS = 10000;

export class Cobra implements CobraEngine {
  private _pvCobraDelete: CallableFunction;
  private _pvCobraProcess: CallableFunction;
  private _pvStatusToString: CallableFunction;

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

  private static _cobraMutex = new Mutex;

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
      this._processMutex.runExclusive(async () => {
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
      }).then((result: number) => {
        resolve(result);
      }).catch((error: any) => {
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
      Cobra._cobraMutex.runExclusive(async () => {
        const wasmOutput = await Cobra.initWasm(accessKey.trim());
        return new Cobra(wasmOutput);
      }).then((result: Cobra) => {
        resolve(result);
      }).catch((error: any) => {
        reject(error);
      });
    });
    return returnPromise;
  }

  private static async initWasm(accessKey: string): Promise<any> {
    const memory = new WebAssembly.Memory({ initial: 100, maximum: 200 });

    const memoryBufferUint8 = new Uint8Array(memory.buffer);
    const memoryBufferInt32 = new Int32Array(memory.buffer);

    const storage = getPvStorage();

    const pvConsoleLogWasm = function (index: number): void {
      // eslint-disable-next-line no-console
      console.log(arrayBufferToStringAtIndex(memoryBufferUint8, index));
    };

    const pvAssertWasm = function (
      expr: number,
      line: number,
      fileNameAddress: number
    ): void {
      if (expr === 0) {
        const fileName = arrayBufferToStringAtIndex(
          memoryBufferUint8,
          fileNameAddress
        );
        throw new Error(`assertion failed at line ${line} in "${fileName}"`);
      }
    };

    const pvTimeWasm = function (): number {
      return Date.now() / 1000;
    };

    const pvHttpsRequestWasm = async function (
      httpMethodAddress: number,
      serverNameAddress: number,
      endpointAddress: number,
      headerAddress: number,
      bodyAddress: number,
      timeoutMs: number,
      responseAddressAddress: number,
      responseSizeAddress: number,
      responseCodeAddress: number
    ): Promise<void> {
      const httpMethod = arrayBufferToStringAtIndex(
        memoryBufferUint8,
        httpMethodAddress
      );
      const serverName = arrayBufferToStringAtIndex(
        memoryBufferUint8,
        serverNameAddress
      );
      const endpoint = arrayBufferToStringAtIndex(
        memoryBufferUint8,
        endpointAddress
      );
      const header = arrayBufferToStringAtIndex(
        memoryBufferUint8,
        headerAddress
      );
      const body = arrayBufferToStringAtIndex(memoryBufferUint8, bodyAddress);

      const headerObject = stringHeaderToObject(header);

      let response: Response;
      let responseText: string;
      let statusCode: number;

      try {
        response = await fetchWithTimeout(
          'https://' + serverName + endpoint,
          {
            method: httpMethod,
            headers: headerObject,
            body: body,
          },
          timeoutMs
        );
        statusCode = response.status;
      } catch (error) {
        statusCode = 0;
      }
      // @ts-ignore
      if (response !== undefined) {
        try {
          responseText = await response.text();
        } catch (error) {
          responseText = '';
          statusCode = 1;
        }
        // eslint-disable-next-line
        const responseAddress = await aligned_alloc(
          Int8Array.BYTES_PER_ELEMENT,
          (responseText.length + 1) * Int8Array.BYTES_PER_ELEMENT
        );
        if (responseAddress === 0) {
          throw new Error('malloc failed: Cannot allocate memory');
        }

        memoryBufferInt32[
          responseSizeAddress / Int32Array.BYTES_PER_ELEMENT
        ] = responseText.length + 1;
        memoryBufferInt32[
          responseAddressAddress / Int32Array.BYTES_PER_ELEMENT
        ] = responseAddress;

        for (let i = 0; i < responseText.length; i++) {
          memoryBufferUint8[responseAddress + i] = responseText.charCodeAt(i);
        }
        memoryBufferUint8[responseAddress + responseText.length] = 0;
      }

      memoryBufferInt32[
        responseCodeAddress / Int32Array.BYTES_PER_ELEMENT
      ] = statusCode;
    };

    const pvFileLoadWasm = async function (
      pathAddress: number,
      numContentBytesAddress: number,
      contentAddressAddress: number,
      succeededAddress: number
    ): Promise<void> {
      const path = arrayBufferToStringAtIndex(memoryBufferUint8, pathAddress);
      try {
        const contentBase64 = await storage.getItem(path);
        const contentBuffer = base64ToUint8Array(contentBase64);
        // eslint-disable-next-line
        const contentAddress = await aligned_alloc(
          Uint8Array.BYTES_PER_ELEMENT,
          contentBuffer.length * Uint8Array.BYTES_PER_ELEMENT
        );

        if (contentAddress === 0) {
          throw new Error('malloc failed: Cannot allocate memory');
        }

        memoryBufferInt32[
          numContentBytesAddress / Int32Array.BYTES_PER_ELEMENT
        ] = contentBuffer.byteLength;
        memoryBufferInt32[
          contentAddressAddress / Int32Array.BYTES_PER_ELEMENT
        ] = contentAddress;
        memoryBufferUint8.set(contentBuffer, contentAddress);
        memoryBufferInt32[
          succeededAddress / Int32Array.BYTES_PER_ELEMENT
        ] = 1;
      } catch (error) {
        memoryBufferInt32[
          succeededAddress / Int32Array.BYTES_PER_ELEMENT
        ] = 0;
      }
    };

    const pvFileSaveWasm = async function (
      pathAddress: number,
      numContentBytes: number,
      contentAddress: number,
      succeededAddress: number
    ): Promise<void> {
      const path = arrayBufferToStringAtIndex(memoryBufferUint8, pathAddress);
      const content = arrayBufferToBase64AtIndex(
        memoryBufferUint8,
        numContentBytes,
        contentAddress
      );
      try {
        await storage.setItem(path, content);
        memoryBufferInt32[
          succeededAddress / Int32Array.BYTES_PER_ELEMENT
        ] = 1;
      } catch (error) {
        memoryBufferInt32[
          succeededAddress / Int32Array.BYTES_PER_ELEMENT
        ] = 0;
      }
    };

    const pvFileExistsWasm = async function (
      pathAddress: number,
      isExistsAddress: number,
      succeededAddress: number
    ): Promise<void> {
      const path = arrayBufferToStringAtIndex(memoryBufferUint8, pathAddress);

      try {
        const isExists = await storage.getItem(path);
        memoryBufferUint8[isExistsAddress] = (isExists === undefined || isExists === null) ? 0 : 1;
        memoryBufferInt32[
          succeededAddress / Int32Array.BYTES_PER_ELEMENT
        ] = 1;
      } catch (error) {
        memoryBufferInt32[
          succeededAddress / Int32Array.BYTES_PER_ELEMENT
        ] = 0;
      }
    };

    const pvFileDeleteWasm = async function (
      pathAddress: number,
      succeededAddress: number
    ): Promise<void> {
      const path = arrayBufferToStringAtIndex(memoryBufferUint8, pathAddress);
      try {
        await storage.removeItem(path);
        memoryBufferInt32[
          succeededAddress / Int32Array.BYTES_PER_ELEMENT
        ] = 1;
      } catch (error) {
        memoryBufferInt32[
          succeededAddress / Int32Array.BYTES_PER_ELEMENT
        ] = 0;
      }
    };

    const pvGetBrowserInfo = async function (browserInfoAddressAddress: number): Promise<void> {
      const userAgent =
        navigator.userAgent !== undefined ? navigator.userAgent : 'unknown';
      // eslint-disable-next-line
      const browserInfoAddress = await aligned_alloc(
        Uint8Array.BYTES_PER_ELEMENT,
        (userAgent.length + 1) * Uint8Array.BYTES_PER_ELEMENT
      );

      if (browserInfoAddress === 0) {
        throw new Error('malloc failed: Cannot allocate memory');
      }

      memoryBufferInt32[
        browserInfoAddressAddress / Int32Array.BYTES_PER_ELEMENT
      ] = browserInfoAddress;
      for (let i = 0; i < userAgent.length; i++) {
        memoryBufferUint8[browserInfoAddress + i] = userAgent.charCodeAt(i);
      }
      memoryBufferUint8[browserInfoAddress + userAgent.length] = 0;
    };

    const pvGetOriginInfo = async function(originInfoAddressAddress: number): Promise<void> {
      const origin = self.origin ?? self.location.origin;
      // eslint-disable-next-line
      const originInfoAddress = await aligned_alloc(
        Uint8Array.BYTES_PER_ELEMENT,
        (origin.length + 1) * Uint8Array.BYTES_PER_ELEMENT
      );

      if (originInfoAddress === 0) {
        throw new Error('malloc failed: Cannot allocate memory');
      }

      memoryBufferInt32[
        originInfoAddressAddress / Int32Array.BYTES_PER_ELEMENT
      ] = originInfoAddress;
      for (let i = 0; i < origin.length; i++) {
        memoryBufferUint8[originInfoAddress + i] = origin.charCodeAt(i);
      }
      memoryBufferUint8[originInfoAddress + origin.length] = 0;
    };

    const importObject = {
      // eslint-disable-next-line camelcase
      wasi_snapshot_preview1: wasiSnapshotPreview1Emulator,
      env: {
        memory: memory,
        // eslint-disable-next-line camelcase
        pv_console_log_wasm: pvConsoleLogWasm,
        // eslint-disable-next-line camelcase
        pv_assert_wasm: pvAssertWasm,
        // eslint-disable-next-line camelcase
        pv_time_wasm: pvTimeWasm,
        // eslint-disable-next-line camelcase
        pv_https_request_wasm: pvHttpsRequestWasm,
        // eslint-disable-next-line camelcase
        pv_file_load_wasm: pvFileLoadWasm,
        // eslint-disable-next-line camelcase
        pv_file_save_wasm: pvFileSaveWasm,
        // eslint-disable-next-line camelcase
        pv_file_exists_wasm: pvFileExistsWasm,
        // eslint-disable-next-line camelcase
        pv_file_delete_wasm: pvFileDeleteWasm,
        // eslint-disable-next-line camelcase
        pv_get_browser_info: pvGetBrowserInfo,
        // eslint-disable-next-line camelcase
        pv_get_origin_info: pvGetOriginInfo,
      },
    };

    const wasmCodeArray = base64ToUint8Array(COBRA_WASM_BASE64);
    const { instance } = await Asyncify.instantiate(
      wasmCodeArray,
      importObject
    );

    const aligned_alloc = instance.exports.aligned_alloc as CallableFunction;

    const pv_cobra_version = instance.exports
      .pv_cobra_version as CallableFunction;
    const pv_cobra_frame_length = instance.exports
      .pv_cobra_frame_length as CallableFunction;
    const pv_cobra_process = instance.exports
      .pv_cobra_process as CallableFunction;
    const pv_cobra_delete = instance.exports
      .pv_cobra_delete as CallableFunction;
    const pv_cobra_init = instance.exports.pv_cobra_init as CallableFunction;
    const pv_status_to_string = instance.exports
      .pv_status_to_string as CallableFunction;
    const pv_sample_rate = instance.exports.pv_sample_rate as CallableFunction;

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
    const objectAddress = memoryBufferView.getInt32(
      objectAddressAddress,
      true
    );

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
