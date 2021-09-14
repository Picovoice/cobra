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

import logging
import os
import platform
import subprocess

log = logging.getLogger('CBR')
log.setLevel(logging.WARNING)


def _pv_linux_machine(machine):
    if machine == 'x86_64':
        return machine
    elif machine == 'aarch64':
        arch_info = '-' + machine
    else:
        arch_info = ''

    cpu_info = subprocess.check_output(['cat', '/proc/cpuinfo']).decode()
    cpu_part_list = [x for x in cpu_info.split('\n') if 'CPU part' in x]
    if len(cpu_part_list) == 0:
        raise RuntimeError('Unsupported CPU.\n%s' % cpu_info)

    cpu_part = cpu_part_list[0].split(' ')[-1].lower()
    if '0xb76' == cpu_part:
        return 'arm11' + arch_info
    elif '0xc07' == cpu_part:
        return 'cortex-a7' + arch_info
    elif '0xd03' == cpu_part:
        return 'cortex-a53' + arch_info
    elif '0xd07' == cpu_part:
        return 'cortex-a57' + arch_info
    elif '0xd08' == cpu_part:
        return 'cortex-a72' + arch_info
    elif '0xc08' == cpu_part:
        return 'beaglebone' + arch_info
    else:
        log.warning(
            'WARNING: Please be advised that this device (CPU part = %s) is not officially supported by Picovoice. '
            'Falling back to the armv6-based (Raspberry Pi Zero) library. This is not tested nor optimal.\n For the model, use Raspberry Pi\'s models' % cpu_part)
        return 'arm11' + arch_info


def _pv_platform():
    pv_system = platform.system()
    if pv_system not in {'Darwin', 'Linux', 'Windows'}:
        raise ValueError("Unsupported system '%s'." % pv_system)

    if pv_system == 'Linux':
        pv_machine = _pv_linux_machine(platform.machine())
    else:
        pv_machine = platform.machine()

    return pv_system, pv_machine


_PV_SYSTEM, _PV_MACHINE = _pv_platform()

_RASPBERRY_PI_MACHINES = {'arm11', 'cortex-a7', 'cortex-a53', 'cortex-a72', 'cortex-a53-aarch64', 'cortex-a72-aarch64'}
_JETSON_MACHINES = {'cortex-a57-aarch64'}


def pv_library_path(relative):
    if _PV_SYSTEM == 'Darwin':
        if _PV_MACHINE == 'x86_64':
            return os.path.join(os.path.dirname(__file__), relative, 'lib/mac/x86_64/libpv_cobra.dylib')
        elif _PV_MACHINE == "arm64":
            return os.path.join(os.path.dirname(__file__), relative, 'lib/mac/arm64/libpv_cobra.dylib')
    elif _PV_SYSTEM == 'Linux':
        if _PV_MACHINE == 'x86_64':
            return os.path.join(os.path.dirname(__file__), relative, 'lib/linux/x86_64/libpv_cobra.so')
        elif _PV_MACHINE in _JETSON_MACHINES:
            return os.path.join(
                os.path.dirname(__file__),
                relative,
                'lib/jetson/%s/libpv_cobra.so' % _PV_MACHINE)
        elif _PV_MACHINE in _RASPBERRY_PI_MACHINES:
            return os.path.join(
                os.path.dirname(__file__),
                relative,
                'lib/raspberry-pi/%s/libpv_cobra.so' % _PV_MACHINE)
        elif _PV_MACHINE == 'beaglebone':
            return os.path.join(os.path.dirname(__file__), relative, 'lib/beaglebone/libpv_cobra.so')
    elif _PV_SYSTEM == 'Windows':
        return os.path.join(os.path.dirname(__file__), relative, 'lib/windows/amd64/libpv_cobra.dll')

    raise NotImplementedError('Unsupported platform.')


def pv_model_path(relative):
    return os.path.join(os.path.dirname(__file__), relative, 'lib/common/cobra_params.pv')


def _pv_keyword_files_subdir():
    if _PV_SYSTEM == 'Darwin':
        return 'mac'
    elif _PV_SYSTEM == 'Linux':
        if _PV_MACHINE == 'x86_64':
            return 'linux'
        elif _PV_MACHINE in _JETSON_MACHINES:
            return 'jetson'
        elif _PV_MACHINE in _RASPBERRY_PI_MACHINES:
            return 'raspberry-pi'
        elif _PV_MACHINE == 'beaglebone':
            return 'beaglebone'
    elif _PV_SYSTEM == 'Windows':
        return 'windows'

    raise NotImplementedError('Unsupported platform')


def pv_keyword_paths(relative):
    keyword_files_dir = \
        os.path.join(os.path.dirname(__file__), relative, 'resources/keyword_files', _pv_keyword_files_subdir())

    res = dict()
    for x in os.listdir(keyword_files_dir):
        res[x.rsplit('_')[0]] = os.path.join(keyword_files_dir, x)

    return res
