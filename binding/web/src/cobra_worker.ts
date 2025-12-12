/*
  Copyright 2022-2025 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import PvWorker from 'web-worker:./cobra_worker_handler.ts';

import {
  CobraOptions,
  CobraWorkerInitResponse,
  CobraWorkerProcessResponse,
  CobraWorkerReleaseResponse,
  PvStatus,
} from './types';

import { pvStatusToException } from './cobra_errors';

export class CobraWorker {
  private readonly _worker: Worker;
  private readonly _version: string;
  private readonly _frameLength: number;
  private readonly _sampleRate: number;
  private static _sdk: string = 'web';

  private static _wasmSimd: string;
  private static _wasmSimdLib: string;
  private static _wasmPThread: string;
  private static _wasmPThreadLib: string;

  private constructor(
    worker: Worker,
    version: string,
    frameLength: number,
    sampleRate: number
  ) {
    this._worker = worker;
    this._version = version;
    this._frameLength = frameLength;
    this._sampleRate = sampleRate;
  }

  /**
   * Get Cobra engine version.
   */
  get version(): string {
    return this._version;
  }

  /**
   * Get require number of samples per frame.
   */
  get frameLength(): number {
    return this._frameLength;
  }

  /**
   * Get required sample rate.
   */
  get sampleRate(): number {
    return this._sampleRate;
  }

  /**
   * Get Cobra worker instance.
   */
  get worker(): Worker {
    return this._worker;
  }

  /**
   * Set base64 wasm file with SIMD feature.
   * @param wasmSimd Base64'd wasm SIMD file to use to initialize wasm.
   */
  public static setWasmSimd(wasmSimd: string): void {
    if (this._wasmSimd === undefined) {
      this._wasmSimd = wasmSimd;
    }
  }

  /**
   * Set base64 wasm file with SIMD feature in text format.
   * @param wasmSimdLib Base64'd wasm SIMD file in text format.
   */
  public static setWasmSimdLib(wasmSimdLib: string): void {
    if (this._wasmSimdLib === undefined) {
      this._wasmSimdLib = wasmSimdLib;
    }
  }

  /**
   * Set base64 wasm file with SIMD and pthread feature.
   * @param wasmPThread Base64'd wasm file to use to initialize wasm.
   */
  public static setWasmPThread(wasmPThread: string): void {
    if (this._wasmPThread === undefined) {
      this._wasmPThread = wasmPThread;
    }
  }

  /**
   * Set base64 SIMD and thread wasm file in text format.
   * @param wasmPThreadLib Base64'd wasm file in text format.
   */
  public static setWasmPThreadLib(wasmPThreadLib: string): void {
    if (this._wasmPThreadLib === undefined) {
      this._wasmPThreadLib = wasmPThreadLib;
    }
  }

  public static setSdk(sdk: string): void {
    CobraWorker._sdk = sdk;
  }

  /**
   * Creates a worker instance of the Picovoice Cobra VAD engine.
   * Behind the scenes, it requires the WebAssembly code to load and initialize before
   * it can create an instance.
   *
   * @param accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
   * @param voiceProbabilityCallback User-defined callback to run after receiving voice probability result.
   * @param options Optional configuration arguments.
   * @param options.device String representation of the device (e.g., CPU or GPU) to use. If set to `best`, the most
   * suitable device is selected automatically. If set to `gpu`, the engine uses the first available GPU device. To
   * select a specific GPU device, set this argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the index of the
   * target GPU. If set to `cpu`, the engine will run on the CPU with the default number of threads. To specify the
   * number of threads, set this argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}` is the desired number of
   * threads.
   * @param options.processErrorCallback User-defined callback invoked if any error happens while processing audio.
   *
   * @returns An instance of CobraWorker.
   */
  public static async create(
    accessKey: string,
    voiceProbabilityCallback: (voiceProbability: number) => void,
    options: CobraOptions = {}
  ): Promise<CobraWorker> {
    const { processErrorCallback, ...workerOptions } = options;

    const worker = new PvWorker();
    const returnPromise: Promise<CobraWorker> = new Promise(
      (resolve, reject) => {
        // @ts-ignore - block from GC
        this.worker = worker;
        worker.onmessage = (
          event: MessageEvent<CobraWorkerInitResponse>
        ): void => {
          switch (event.data.command) {
            case 'ok':
              worker.onmessage = (
                ev: MessageEvent<CobraWorkerProcessResponse>
              ): void => {
                switch (ev.data.command) {
                  case 'ok':
                    voiceProbabilityCallback(ev.data.voiceProbability);
                    break;
                  case 'failed':
                  case 'error': {
                    const error = pvStatusToException(ev.data.status, ev.data.shortMessage, ev.data.messageStack);
                    if (processErrorCallback) {
                      processErrorCallback(error);
                    } else {
                      // eslint-disable-next-line no-console
                      console.error(error);
                    }
                    break;
                  }
                  default:
                    // @ts-ignore
                    processErrorCallback(pvStatusToException(PvStatus.RUNTIME_ERROR, `Unrecognized command: ${event.data.command}`));
                }
              };
              resolve(
                new CobraWorker(
                  worker,
                  event.data.version,
                  event.data.frameLength,
                  event.data.sampleRate
                )
              );
              break;
            case 'failed':
            case 'error': {
              const error = pvStatusToException(event.data.status, event.data.shortMessage, event.data.messageStack);
              reject(error);
              break;
            }
            default:
              // @ts-ignore
              reject(pvStatusToException(PvStatus.RUNTIME_ERROR, `Unrecognized command: ${event.data.command}`));
          }
        };
      }
    );

    worker.postMessage({
      command: 'init',
      accessKey: accessKey,
      wasmSimd: this._wasmSimd,
      wasmSimdLib: this._wasmSimdLib,
      wasmPThread: this._wasmPThread,
      wasmPThreadLib: this._wasmPThreadLib,
      sdk: this._sdk,
      options: workerOptions,
    });

    return returnPromise;
  }

  /**
   * Processes a frame of audio in a worker.
   * The voice probability result will be sent via the user provided voiceProbabilityCallback.
   * It is also possible to send a message directly using 'this.worker.postMessage({command: "process", pcm: [...]})'.
   *
   * @param pcm A frame of audio samples.
   */
  public process(pcm: Int16Array): void {
    this._worker.postMessage({
      command: 'process',
      inputFrame: pcm,
    });
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public release(): Promise<void> {
    const returnPromise: Promise<void> = new Promise((resolve, reject) => {
      this._worker.onmessage = (
        event: MessageEvent<CobraWorkerReleaseResponse>
      ): void => {
        switch (event.data.command) {
          case 'ok':
            resolve();
            break;
          case 'failed':
          case 'error': {
            const error = pvStatusToException(event.data.status, event.data.shortMessage, event.data.messageStack);
            reject(error);
            break;
          }
          default:
            // @ts-ignore
            reject(pvStatusToException(PvStatus.RUNTIME_ERROR, `Unrecognized command: ${event.data.command}`));
        }
      };
    });

    this._worker.postMessage({
      command: 'release',
    });

    return returnPromise;
  }

  /**
   * Terminates the active worker. Stops all requests being handled by worker.
   */
  public terminate(): void {
    this._worker.terminate();
  }
}
