//
// Copyright 2024 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
'use strict';

import PvStatus from './pv_status_t';

export class CobraError extends Error {
  private readonly _message: string;
  private readonly _messageStack: string[];

  constructor(message: string, messageStack: string[] = []) {
    super(CobraError.errorToString(message, messageStack));
    this._message = message;
    this._messageStack = messageStack;
  }

  get message(): string {
    return this._message;
  }

  get messageStack(): string[] {
    return this._messageStack;
  }

  private static errorToString(
    initial: string,
    messageStack: string[]
  ): string {
    let msg = initial;

    if (messageStack.length > 0) {
      msg += `: ${messageStack.reduce((acc, value, index) =>
        acc + '\n  [' + index + '] ' + value, '')}`;
    }

    return msg;
  }
}

export class CobraOutOfMemoryError extends CobraError {}
export class CobraIOError extends CobraError {}
export class CobraInvalidArgumentError extends CobraError {}
export class CobraStopIterationError extends CobraError {}
export class CobraKeyError extends CobraError {}
export class CobraInvalidStateError extends CobraError {}
export class CobraRuntimeError extends CobraError {}
export class CobraActivationError extends CobraError {}
export class CobraActivationLimitReachedError extends CobraError {}
export class CobraActivationThrottledError extends CobraError {}
export class CobraActivationRefusedError extends CobraError {}

export function pvStatusToException(
  pvStatus: PvStatus,
  errorMessage: string,
  messageStack: string[] = []
): CobraError {
  switch (pvStatus) {
    case PvStatus.OUT_OF_MEMORY:
      throw new CobraOutOfMemoryError(errorMessage, messageStack);
    case PvStatus.IO_ERROR:
      throw new CobraIOError(errorMessage, messageStack);
    case PvStatus.INVALID_ARGUMENT:
      throw new CobraInvalidArgumentError(errorMessage, messageStack);
    case PvStatus.STOP_ITERATION:
      throw new CobraStopIterationError(errorMessage, messageStack);
    case PvStatus.KEY_ERROR:
      throw new CobraKeyError(errorMessage, messageStack);
    case PvStatus.INVALID_STATE:
      throw new CobraInvalidStateError(errorMessage, messageStack);
    case PvStatus.RUNTIME_ERROR:
      throw new CobraRuntimeError(errorMessage, messageStack);
    case PvStatus.ACTIVATION_ERROR:
      throw new CobraActivationError(errorMessage, messageStack);
    case PvStatus.ACTIVATION_LIMIT_REACHED:
      throw new CobraActivationLimitReachedError(errorMessage, messageStack);
    case PvStatus.ACTIVATION_THROTTLED:
      throw new CobraActivationThrottledError(errorMessage, messageStack);
    case PvStatus.ACTIVATION_REFUSED:
      throw new CobraActivationRefusedError(errorMessage, messageStack);
    default:
      // eslint-disable-next-line no-console
      console.warn(`Unmapped error code: ${pvStatus}`);
      throw new CobraError(errorMessage, messageStack);
  }
}
