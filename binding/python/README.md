# Cobra Voice Activity Detection engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cobra is a highly accurate and lightweight voice activity detection (VAD) engine.

## Compatibility

- Python 3
- Runs on Linux (x86_64), macOS (x86_64), Windows (x86_64), Raspberry Pi, NVIDIA Jetson (Nano), and BeagleBone.

## Installation

```console
pip3 install pvcobra
```

## Usage

Create an instance of the engine

```python
import pvcobra

handle = pvcobra.create(access_key={AccessKey})
```
where `{AccessKey}` is an AccessKey which should be obtained from [Picovoice Console](https://picovoice.ai/console/). `handle` is an instance of Cobra that detects voice activities.

```python
def get_next_audio_frame():
    pass

threshold = ... # detection threshold within [0, 1]

while True:
    voice_probability = handle.process(get_next_audio_frame())
    if voice_probability >= threshold:
        # detection event callback
        pass
```

When done, resources have to be released explicitly:

```python
handle.delete()
```

## Demos

[pvcobrademo](https://pypi.org/project/pvcobrademo/) provides command-line utilities for processing real-time
audio (i.e. microphone) and files using Cobra.
