/*
  Copyright 2022-2023 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/// <reference no-default-lib="false"/>
/// <reference lib="webworker" />

import { Cobra } from './cobra';
import { CobraWorkerRequest, PvStatus } from './types';
import { CobraError } from "./cobra_errors";

let cobra: Cobra | null = null;

const voiceProbabilityCallback = (voiceProbability: number): void => {
  self.postMessage({
    command: 'ok',
    voiceProbability: voiceProbability,
  });
};

const processErrorCallback = (error: CobraError): void => {
  self.postMessage({
    command: 'error',
    status: error.status,
    shortMessage: error.shortMessage,
    messageStack: error.messageStack
  });
};

/**
 * Cobra worker handler.
 */
self.onmessage = async function (
  event: MessageEvent<CobraWorkerRequest>
): Promise<void> {
  switch (event.data.command) {
    case 'init':
      if (cobra !== null) {
        self.postMessage({
          command: 'error',
          status: PvStatus.INVALID_STATE,
          shortMessage: 'Cobra already initialized',
        });
        return;
      }
      try {
        event.data.options.processErrorCallback = processErrorCallback;

        Cobra.setWasm(event.data.wasm);
        Cobra.setWasmSimd(event.data.wasmSimd);
        Cobra.setSdk(event.data.sdk);
        cobra = await Cobra.create(
          event.data.accessKey,
          voiceProbabilityCallback,
          event.data.options
        );

        self.postMessage({
          command: 'ok',
          version: cobra.version,
          frameLength: cobra.frameLength,
          sampleRate: cobra.sampleRate,
        });
      } catch (e: any) {
        if (e instanceof CobraError) {
          self.postMessage({
            command: 'error',
            status: e.status,
            shortMessage: e.shortMessage,
            messageStack: e.messageStack
          });
        } else {
          self.postMessage({
            command: 'error',
            status: PvStatus.RUNTIME_ERROR,
            shortMessage: e.message
          });
        }
      }
      break;
    case 'process':
      if (cobra === null) {
        self.postMessage({
          command: 'error',
          status: PvStatus.INVALID_STATE,
          shortMessage: 'Cobra not initialized',
        });
        return;
      }

      await cobra.process(event.data.inputFrame);
      break;
    case 'release':
      if (cobra !== null) {
        await cobra.release();
        cobra = null;
        close();
      }
      self.postMessage({
        command: 'ok',
      });
      break;
    default:
      self.postMessage({
        command: 'failed',
        status: PvStatus.RUNTIME_ERROR,
        // @ts-ignore
        shortMessage: `Unrecognized command: ${event.data.command}`,
      });
  }
};
