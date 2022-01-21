# Cobra Voice Activity Detection Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cobra is a highly accurate and lightweight voice activity detection (VAD) engine.

## Compatibility

- Python 3.5+
- Runs on Linux (x86_64), macOS (x86_64), Windows (x86_64), Raspberry Pi, NVIDIA Jetson (Nano), and BeagleBone.

## Installation

```console
pip3 install pvcobra
```

## Usage

Create an instance of the engine

```python
import pvcobra

handle = pvcobra.create(access_key=${AccessKey})
```
Replace `${AccessKey}` with your AccessKey obtained from [Picovoice Console](https://picovoice.ai/console/). `handle` is
an instance of Cobra.

When initialized, the valid sample rate is given by `handle.sample_rate`. Expected frame length (number of audio samples
in an input array) is `handle.frame_length`. The engine accepts 16-bit linearly-encoded PCM and operates on
single-channel audio.

```python
def get_next_audio_frame():
    pass

while True:
    voice_probability = handle.process(get_next_audio_frame())
```

When done, resources have to be released explicitly:

```python
handle.delete()
```

## Demos

[pvcobrademo](https://pypi.org/project/pvcobrademo/) provides command-line utilities for processing real-time
audio (i.e. microphone) and files using Cobra.
