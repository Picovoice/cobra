import { Cobra } from './cobra';
import { CobraWorker } from './cobra_worker';

import {
  CobraOptions,
  CobraWorkerInitRequest,
  CobraWorkerProcessRequest,
  CobraWorkerReleaseRequest,
  CobraWorkerRequest,
  CobraWorkerInitResponse,
  CobraWorkerProcessResponse,
  CobraWorkerReleaseResponse,
  CobraWorkerFailureResponse,
  CobraWorkerResponse,
} from './types';

import cobraWasmSimd from './lib/pv_cobra_simd.wasm';
import cobraWasmSimdLib from './lib/pv_cobra_simd.txt';
import cobraWasmPThread from './lib/pv_cobra_pthread.wasm';
import cobraWasmPThreadLib from './lib/pv_cobra_pthread.txt';

import * as CobraErrors from './cobra_errors';

Cobra.setWasmSimd(cobraWasmSimd);
Cobra.setWasmSimdLib(cobraWasmSimdLib);
Cobra.setWasmPThread(cobraWasmPThread);
Cobra.setWasmPThreadLib(cobraWasmPThreadLib);
CobraWorker.setWasmSimd(cobraWasmSimd);
CobraWorker.setWasmSimdLib(cobraWasmSimdLib);
CobraWorker.setWasmPThread(cobraWasmPThread);
CobraWorker.setWasmPThreadLib(cobraWasmPThreadLib);

export {
  Cobra,
  CobraOptions,
  CobraWorker,
  CobraWorkerInitRequest,
  CobraWorkerProcessRequest,
  CobraWorkerReleaseRequest,
  CobraWorkerRequest,
  CobraWorkerInitResponse,
  CobraWorkerProcessResponse,
  CobraWorkerReleaseResponse,
  CobraWorkerFailureResponse,
  CobraWorkerResponse,
  CobraErrors,
};
