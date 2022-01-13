/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

export type CobraWorkerRequestInit = {
  command: 'init';
  accessKey: string;
  start?: boolean;
};

export type CobraWorkerRequestProcess = {
  command: 'process';
  inputFrame: Int16Array;
};

export type CobraWorkerRequestVoid = {
  command: 'reset' | 'pause' | 'resume' | 'release';
};

export type CobraWorkerRequest =
  | CobraWorkerRequestInit
  | CobraWorkerRequestProcess
  | CobraWorkerRequestVoid;

export type CobraWorkerResponseReady = {
  command: 'cobra-ready';
};

export type CobraWorkerResponseFailed = {
  command: 'cobra-failed';
  message: string;
};

export type CobraWorkerResponseVoiceProbability = {
  command: 'cobra-detect';
  voiceProbability: number;
};

export type CobraWorkerResponse =
  | CobraWorkerResponseReady
  | CobraWorkerResponseFailed
  | CobraWorkerResponseVoiceProbability;

export interface CobraEngine {
  /** Release all resources acquired by Cobra */
  release(): Promise<void>;
  /** Process a single frame of 16-bit 16kHz PCM audio */
  process(frame: Int16Array): Promise<number>;
  /** The version of the Cobra engine */
  readonly version: string;
  /** The sampling rate of audio expected by the Cobra engine */
  readonly sampleRate: number;
  /** The frame length of audio expected by the Cobra engine */
  readonly frameLength: number;
}
