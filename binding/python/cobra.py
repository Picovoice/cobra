#
# Copyright 2021 Picovoice Inc.
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
        PicovoiceStatuses.OUT_OF_MEMORY: MemoryError,
        PicovoiceStatuses.IO_ERROR: IOError,
        PicovoiceStatuses.INVALID_ARGUMENT: ValueError,
        PicovoiceStatuses.STOP_ITERATION: StopIteration,
        PicovoiceStatuses.KEY_ERROR: KeyError,
        PicovoiceStatuses.INVALID_STATE: ValueError,
        PicovoiceStatuses.RUNTIME_ERROR: RuntimeError,
        PicovoiceStatuses.ACTIVATION_ERROR: RuntimeError,
        PicovoiceStatuses.ACTIVATION_LIMIT_REACHED: PermissionError,
        PicovoiceStatuses.ACTIVATION_THROTTLED: PermissionError,
        PicovoiceStatuses.ACTIVATION_REFUSED: PermissionError
    }

    class CCobra(Structure):
        pass

    def __init__(self, library_path, access_key):
        """
        Constructor.

        :param library_path: Absolute path to Cobra's dynamic library.
        :param access_key: AccessKey provided by Picovoice Console (https://picovoice.ai/console/)
        """

        if not os.path.exists(library_path):
            raise IOError("Couldn't find Cobra's dynamic library at '%s'." % library_path)

        library = cdll.LoadLibrary(library_path)

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
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]()

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

    def process(self, pcm):
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
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]()

        return result.value

    @property
    def version(self):
        """Version"""

        return self._version

    @property
    def frame_length(self):
        """Number of audio samples per frame."""

        return self._frame_length

    @property
    def sample_rate(self):
        """Audio sample rate accepted by Picovoice."""

        return self._sample_rate
