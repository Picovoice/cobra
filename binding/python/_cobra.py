#
# Copyright 2021-2023 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import os
from ctypes import *
from enum import Enum
from typing import Sequence


class CobraError(Exception):
    def __init__(self, message: str = '', message_stack: Sequence[str] = None):
        super().__init__(message)

        self._message = message
        self._message_stack = list() if message_stack is None else message_stack

    def __str__(self):
        message = self._message
        if len(self._message_stack) > 0:
            message += ':'
            for i in range(len(self._message_stack)):
                message += '\n  [%d] %s' % (i, self._message_stack[i])
        return message

    @property
    def message(self) -> str:
        return self._message

    @property
    def message_stack(self) -> Sequence[str]:
        return self._message_stack


class CobraMemoryError(CobraError):
    pass


class CobraIOError(CobraError):
    pass


class CobraInvalidArgumentError(CobraError):
    pass


class CobraStopIterationError(CobraError):
    pass


class CobraKeyError(CobraError):
    pass


class CobraInvalidStateError(CobraError):
    pass


class CobraRuntimeError(CobraError):
    pass


class CobraActivationError(CobraError):
    pass


class CobraActivationLimitError(CobraError):
    pass


class CobraActivationThrottledError(CobraError):
    pass


class CobraActivationRefusedError(CobraError):
    pass


class Cobra(object):
    """
    Python binding for Cobra voice activity detection (VAD) engine. It detects speech signals within an incoming
    stream of audio in real-time. It processes incoming audio in consecutive frames and for each frame emits the
    probability of voice activity. The number of samples per frame can be attained by calling '.frame_length'.
    The incoming audio needs to have a sample rate equal to '.sample_rate' and be 16-bit linearly-encoded. Cobra
    operates on single-channel audio.
    """

    class PicovoiceStatuses(Enum):
        SUCCESS = 0
        OUT_OF_MEMORY = 1
        IO_ERROR = 2
        INVALID_ARGUMENT = 3
        STOP_ITERATION = 4
        KEY_ERROR = 5
        INVALID_STATE = 6
        RUNTIME_ERROR = 7
        ACTIVATION_ERROR = 8
        ACTIVATION_LIMIT_REACHED = 9
        ACTIVATION_THROTTLED = 10
        ACTIVATION_REFUSED = 11

    _PICOVOICE_STATUS_TO_EXCEPTION = {
        PicovoiceStatuses.OUT_OF_MEMORY: CobraMemoryError,
        PicovoiceStatuses.IO_ERROR: CobraIOError,
        PicovoiceStatuses.INVALID_ARGUMENT: CobraInvalidArgumentError,
        PicovoiceStatuses.STOP_ITERATION: CobraStopIterationError,
        PicovoiceStatuses.KEY_ERROR: CobraKeyError,
        PicovoiceStatuses.INVALID_STATE: CobraInvalidStateError,
        PicovoiceStatuses.RUNTIME_ERROR: CobraRuntimeError,
        PicovoiceStatuses.ACTIVATION_ERROR: CobraActivationError,
        PicovoiceStatuses.ACTIVATION_LIMIT_REACHED: CobraActivationLimitError,
        PicovoiceStatuses.ACTIVATION_THROTTLED: CobraActivationThrottledError,
        PicovoiceStatuses.ACTIVATION_REFUSED: CobraActivationRefusedError
    }

    class CCobra(Structure):
        pass

    def __init__(self, access_key: str, library_path: str):
        """
        Constructor.

        :param access_key: AccessKey provided by Picovoice Console (https://console.picovoice.ai/)
        :param library_path: Absolute path to Cobra's dynamic library.
        """

        if not access_key:
            raise ValueError("access_key should be a non-empty string.")

        if not os.path.exists(library_path):
            raise IOError("Couldn't find Cobra's dynamic library at '%s'." % library_path)

        library = cdll.LoadLibrary(library_path)

        set_sdk_func = library.pv_set_sdk
        set_sdk_func.argtypes = [c_char_p]
        set_sdk_func.restype = None

        set_sdk_func('python'.encode('utf-8'))

        self._get_error_stack_func = library.pv_get_error_stack
        self._get_error_stack_func.argtypes = [POINTER(POINTER(c_char_p)), POINTER(c_int)]
        self._get_error_stack_func.restype = self.PicovoiceStatuses

        self._free_error_stack_func = library.pv_free_error_stack
        self._free_error_stack_func.argtypes = [POINTER(c_char_p)]
        self._free_error_stack_func.restype = None

        init_func = library.pv_cobra_init
        init_func.argtypes = [
            c_char_p,
            POINTER(POINTER(self.CCobra))]
        init_func.restype = self.PicovoiceStatuses

        self._handle = POINTER(self.CCobra)()

        status = init_func(
            access_key.encode('utf-8'),
            byref(self._handle))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message='Initialization failed',
                message_stack=self._get_error_stack())

        self._delete_func = library.pv_cobra_delete
        self._delete_func.argtypes = [POINTER(self.CCobra)]
        self._delete_func.restype = None

        self.process_func = library.pv_cobra_process
        self.process_func.argtypes = [POINTER(self.CCobra), POINTER(c_short), POINTER(c_float)]
        self.process_func.restype = self.PicovoiceStatuses

        version_func = library.pv_cobra_version
        version_func.argtypes = []
        version_func.restype = c_char_p
        self._version = version_func().decode('utf-8')

        self._frame_length = library.pv_cobra_frame_length()

        self._sample_rate = library.pv_sample_rate()

    def delete(self):
        """Releases resources acquired by Cobra."""

        self._delete_func(self._handle)

    def process(self, pcm: Sequence[int]) -> float:
        """
        Processes a frame of the incoming audio stream and emits the probability of voice activity.

        :param pcm: A frame of audio samples. The number of samples per frame can be attained by calling
        `.frame_length`. The incoming audio needs to have a sample rate equal to `.sample_rate` and be 16-bit
        linearly-encoded. Cobra operates on single-channel audio.
        :return: Probability of voice activity. It is a floating-point number within [0, 1].
        """

        if len(pcm) != self.frame_length:
            raise ValueError("Invalid frame length. expected %d but received %d" % (self.frame_length, len(pcm)))

        result = c_float()
        status = self.process_func(self._handle, (c_short * len(pcm))(*pcm), byref(result))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message='Processing failed',
                message_stack=self._get_error_stack())

        return result.value

    @property
    def version(self) -> str:
        """Version"""

        return self._version

    @property
    def frame_length(self) -> int:
        """Number of audio samples per frame."""

        return self._frame_length

    @property
    def sample_rate(self) -> int:
        """Audio sample rate accepted by Picovoice."""

        return self._sample_rate

    def _get_error_stack(self) -> Sequence[str]:
        message_stack_ref = POINTER(c_char_p)()
        message_stack_depth = c_int()
        status = self._get_error_stack_func(byref(message_stack_ref), byref(message_stack_depth))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](message='Unable to get Cobra error state')

        message_stack = list()
        for i in range(message_stack_depth.value):
            message_stack.append(message_stack_ref[i].decode('utf-8'))

        self._free_error_stack_func(message_stack_ref)

        return message_stack


__all__ = [
    'Cobra',
    'CobraActivationError',
    'CobraActivationLimitError',
    'CobraActivationRefusedError',
    'CobraActivationThrottledError',
    'CobraError',
    'CobraIOError',
    'CobraInvalidArgumentError',
    'CobraInvalidStateError',
    'CobraKeyError',
    'CobraMemoryError',
    'CobraRuntimeError',
    'CobraStopIterationError',
]
