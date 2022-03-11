import os
import shutil

import setuptools

os.system('git clean -dfx')

package_folder = os.path.join(os.path.dirname(__file__), 'pvcobrademo')
os.mkdir(package_folder)

shutil.copy(os.path.join(os.path.dirname(__file__), '../../LICENSE'), package_folder)

shutil.copy(
    os.path.join(os.path.dirname(__file__), 'cobra_demo_file.py'),
    os.path.join(package_folder, 'cobra_demo_file.py'))

shutil.copy(
    os.path.join(os.path.dirname(__file__), 'cobra_demo_mic.py'),
    os.path.join(package_folder, 'cobra_demo_mic.py'))

with open(os.path.join(os.path.dirname(__file__), 'MANIFEST.in'), 'w') as f:
    f.write('include pvcobrademo/LICENSE\n')
    f.write('include pvcobrademo/cobra_demo_file.py\n')
    f.write('include pvcobrademo/cobra_demo_mic.py\n')

with open(os.path.join(os.path.dirname(__file__), 'README.md'), 'r') as f:
    long_description = f.read()

setuptools.setup(
    name="pvcobrademo",
    version="1.1.2",
    author="Picovoice",
    author_email="hello@picovoice.ai",
    description="Cobra voice activity detection (VAD) engine demos.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Picovoice/cobra",
    packages=["pvcobrademo"],
    install_requires=["pvcobra==1.1.2", "pvrecorder==1.0.2"],
    include_package_data=True,
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Topic :: Multimedia :: Sound/Audio :: Speech"
    ],
    entry_points=dict(
        console_scripts=[
            'cobra_demo_file=pvcobrademo.cobra_demo_file:main',
            'cobra_demo_mic=pvcobrademo.cobra_demo_mic:main',
        ],
    ),
    python_requires='>=3.5',
    keywords="voice activity detection engine, VAD",
)
