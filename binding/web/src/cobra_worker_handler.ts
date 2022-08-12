/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/// <reference no-default-lib="false"/>
/// <reference lib="webworker" />

import { Cobra } from './cobra';
import { CobraWorkerRequest } from './types';

/**
 * Cobra worker handler.
 */
let cobra: Cobra | null = null;
self.onmessage = async function (
  event: MessageEvent<CobraWorkerRequest>
): Promise<void> {
  switch (event.data.command) {
    case 'init':
      if (cobra !== null) {
        self.postMessage({
          command: 'error',
          message: 'Cobra already initialized',
        });
        return;
      }
      try {
        Cobra.setWasm(event.data.wasm);
        Cobra.setWasmSimd(event.data.wasmSimd);
        cobra = await Cobra.create(event.data.accessKey);
        self.postMessage({
          command: 'ok',
          version: cobra.version,
          frameLength: cobra.frameLength,
          sampleRate: cobra.sampleRate,
        });
      } catch (e: any) {
        self.postMessage({
          command: 'error',
          message: e.message,
        });
      }
      break;
    case 'process':
      if (cobra === null) {
        self.postMessage({
          command: 'error',
          message: 'Cobra not initialized',
        });
        return;
      }
      try {
        const voiceProbability = await cobra.process(event.data.inputFrame);
        self.postMessage({
          command: 'ok',
          voiceProbability: voiceProbability,
        });
      } catch (e: any) {
        self.postMessage({
          command: 'error',
          message: e.message,
        });
      }
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
        // @ts-ignore
        message: `Unrecognized command: ${event.data.command}`,
      });
  }
};
