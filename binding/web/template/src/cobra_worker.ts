/*
  Copyright 2018-2021 Picovoice Inc.
  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.
  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import {
  CobraEngine,
  CobraWorkerRequest,
  CobraWorkerResponseReady,
  CobraWorkerResponseFailed,
  CobraWorkerResponseVoiceProbability,
} from './cobra_types';

import { Cobra } from './cobra';

let paused = true;
let cobraEngine: CobraEngine | null = null;

async function init(accessKey: string, start = true): Promise<void> {
  try {
    cobraEngine = await Cobra.create(accessKey);
    const cobraReadyMessage: CobraWorkerResponseReady = {
      command: 'cobra-ready',
    };
    paused = !start;
    // @ts-ignore
    postMessage(cobraReadyMessage, undefined);
  } catch (error) {
    const errorMessage = String(error);
    const cobraFailedMessage: CobraWorkerResponseFailed = {
      command: 'cobra-failed',
      message: errorMessage,
    };
    postMessage(cobraFailedMessage, undefined);
  }
}

async function process(inputFrame: Int16Array): Promise<void> {
  if (cobraEngine !== null && !paused) {
    const voiceProbability = await cobraEngine.process(inputFrame);
    const cobraDetectMessage: CobraWorkerResponseVoiceProbability = {
      command: 'cobra-detect',
      voiceProbability: voiceProbability,
    };
    // @ts-ignore
    postMessage(cobraDetectMessage, undefined);
  }
}

async function release(): Promise<void> {
  if (cobraEngine !== null) {
    await cobraEngine.release();
  }

  cobraEngine = null;
  close();
}

onmessage = function (
  event: MessageEvent<CobraWorkerRequest>
): void {
  switch (event.data.command) {
    case 'init':
      init(event.data.accessKey, event.data.start);
      break;
    case 'process':
      process(event.data.inputFrame);
      break;
    case 'pause':
      paused = true;
      break;
    case 'resume':
      paused = false;
      break;
    case 'release':
      release();
      break;
    default:
      // eslint-disable-next-line no-console
      console.warn('Unhandled command in cobra_worker: ' + event.data.command);
  }
};
