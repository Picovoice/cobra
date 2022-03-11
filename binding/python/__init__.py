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

from .cobra import Cobra
from .util import *

LIBRARY_PATH = pv_library_path('')


def create(access_key, library_path=None):
    """
    Factory method for Cobra voice activity detection (VAD) engine.

    :param access_key: AccessKey provided by Picovoice Console (https://console.picovoice.ai/)
    :param library_path: Absolute path to Cobra's dynamic library. If not set it will be set to the default
    :return: An instance of Cobra voice activity detection engine.
    """

    if library_path is None:
        library_path = LIBRARY_PATH

    return Cobra(library_path=library_path, access_key=access_key)
