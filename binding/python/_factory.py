#
# Copyright 2021-2025 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

from typing import (
    Optional,
    Sequence
)

from ._cobra import *
from ._util import *


def create(
        access_key: str,
        device: Optional[str] = None,
        library_path: Optional[str] = None) -> Cobra:
    """
    Factory method for Cobra voice activity detection (VAD) engine.

    :param access_key: AccessKey provided by Picovoice Console (https://console.picovoice.ai/)
    :param device: String representation of the device (e.g., CPU or GPU) to use. If set to
    `best`, the most suitable device is selected automatically. If set to `gpu`, the engine
    uses the first available GPU device. To select a specific GPU device, set this argument
    to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the index of the target GPU. If set to
    `cpu`, the engine will run on the CPU with the default number of threads. To specify
    the number of threads, set this argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}`
    is the desired number of threads.
    :param library_path: Absolute path to Cobra's dynamic library. If not set it will be set to the default
    :return: An instance of Cobra voice activity detection engine.
    """

    if library_path is None:
        library_path = pv_library_path('')

    if device is None:
        device = "best"

    return Cobra(access_key=access_key, device=device, library_path=library_path)


def available_devices(library_path: Optional[str] = None) -> Sequence[str]:
    """
    Lists all available devices that Cobra can use for inference. Each entry in the list can be the `device`
    argument of `.create` factory method or `Cobra` constructor.
    :param library_path: Absolute path to Cobra's dynamic library.
    If not set it will be set to the default location.
    :return: List of all available devices that Cobra can use for inference.
    """

    if library_path is None:
        library_path = pv_library_path()

    return list_hardware_devices(library_path=library_path)


__all__ = [
    'create',
    'available_devices',
]
