#
# Copyright 2021-2024 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import os
import shutil

import setuptools

os.system('git clean -dfx')

package_folder = os.path.join(os.path.dirname(__file__), 'pvcobra')
os.mkdir(package_folder)

shutil.copy(os.path.join(os.path.dirname(__file__), '../../LICENSE'), package_folder)

shutil.copy(os.path.join(os.path.dirname(__file__), '__init__.py'), os.path.join(package_folder, '__init__.py'))
shutil.copy(os.path.join(os.path.dirname(__file__), '_cobra.py'), os.path.join(package_folder, '_cobra.py'))
shutil.copy(os.path.join(os.path.dirname(__file__), '_factory.py'), os.path.join(package_folder, '_factory.py'))
shutil.copy(os.path.join(os.path.dirname(__file__), '_util.py'), os.path.join(package_folder, '_util.py'))

platforms = ('linux', 'mac', 'raspberry-pi', 'windows')

os.mkdir(os.path.join(package_folder, 'lib'))
for platform in platforms:
    shutil.copytree(
        os.path.join(os.path.dirname(__file__), '../../lib', platform),
        os.path.join(package_folder, 'lib', platform))

MANIFEST_IN = """
include pvcobra/LICENSE
include pvcobra/__init__.py
include pvcobra/_cobra.py
include pvcobra/_factory.py
include pvcobra/_util.py
include pvcobra/lib/linux/x86_64/libpv_cobra.so
include pvcobra/lib/mac/x86_64/libpv_cobra.dylib
include pvcobra/lib/mac/arm64/libpv_cobra.dylib
recursive-include pvcobra/lib/raspberry-pi *
include pvcobra/lib/windows/amd64/libpv_cobra.dll
"""

with open(os.path.join(os.path.dirname(__file__), 'MANIFEST.in'), 'w') as f:
    f.write(MANIFEST_IN.strip('\n '))

with open(os.path.join(os.path.dirname(__file__), 'README.md'), 'r') as f:
    long_description = f.read()

setuptools.setup(
    name="pvcobra",
    version="2.0.3",
    author="Picovoice",
    author_email="hello@picovoice.ai",
    description="Cobra voice activity detection (VAD) engine",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Picovoice/cobra",
    packages=["pvcobra"],
    include_package_data=True,
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Topic :: Multimedia :: Sound/Audio :: Speech"
    ],
    python_requires='>=3.8',
    keywords="voice activity detection engine, VAD",
)
