/*
  Copyright 2022-2023 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import { CobraError } from "./cobra_errors";

export enum PvStatus {
  SUCCESS = 10000,
  OUT_OF_MEMORY,
  IO_ERROR,
  INVALID_ARGUMENT,
  STOP_ITERATION,
  KEY_ERROR,
  INVALID_STATE,
  RUNTIME_ERROR,
  ACTIVATION_ERROR,
  ACTIVATION_LIMIT_REACHED,
  ACTIVATION_THROTTLED,
  ACTIVATION_REFUSED,
}

export type CobraOptions = {
  /** @defaultValue undefined */
  processErrorCallback?: (error: CobraError) => void;
};

export type CobraWorkerInitRequest = {
  command: 'init';
  accessKey: string;
  wasm: string;
  wasmSimd: string;
  sdk: string;
  options: CobraOptions;
};

export type CobraWorkerProcessRequest = {
  command: 'process';
  inputFrame: Int16Array;
};

export type CobraWorkerReleaseRequest = {
  command: 'release';
};

export type CobraWorkerRequest =
  | CobraWorkerInitRequest
  | CobraWorkerProcessRequest
  | CobraWorkerReleaseRequest;

export type CobraWorkerFailureResponse = {
  command: 'failed' | 'error';
  status: PvStatus;
  shortMessage: string;
  messageStack: string[];
};

export type CobraWorkerInitResponse =
  | CobraWorkerFailureResponse
  | {
      command: 'ok';
      frameLength: number;
      sampleRate: number;
      version: string;
    };

export type CobraWorkerProcessResponse =
  | CobraWorkerFailureResponse
  | {
      command: 'ok';
      voiceProbability: number;
    };

export type CobraWorkerReleaseResponse =
  | CobraWorkerFailureResponse
  | {
      command: 'ok';
    };

export type CobraWorkerResponse =
  | CobraWorkerInitResponse
  | CobraWorkerProcessResponse
  | CobraWorkerReleaseResponse;
