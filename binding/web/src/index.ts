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

import cobraWasm from './lib/pv_cobra.wasm';
import cobraWasmLib from './lib/pv_cobra.txt';
import cobraWasmSimd from './lib/pv_cobra_simd.wasm';
import cobraWasmSimdLib from './lib/pv_cobra_simd.txt';

import * as CobraErrors from './cobra_errors';

Cobra.setWasm(cobraWasm);
Cobra.setWasmLib(cobraWasmLib);
Cobra.setWasmSimd(cobraWasmSimd);
Cobra.setWasmSimdLib(cobraWasmSimdLib);
CobraWorker.setWasm(cobraWasm);
CobraWorker.setWasmLib(cobraWasmLib);
CobraWorker.setWasmSimd(cobraWasmSimd);
CobraWorker.setWasmSimdLib(cobraWasmSimdLib);

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
