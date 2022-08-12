import { Cobra } from './cobra';
import { CobraWorker } from './cobra_worker';

import {
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

import cobraWasm from '../lib/pv_cobra.wasm';
import cobraWasmSimd from '../lib/pv_cobra_simd.wasm';

Cobra.setWasm(cobraWasm);
Cobra.setWasmSimd(cobraWasmSimd);
CobraWorker.setWasm(cobraWasm);
CobraWorker.setWasmSimd(cobraWasmSimd);

export {
  Cobra,
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
};
