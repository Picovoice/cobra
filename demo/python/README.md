# Cobra Voice Activity Detection engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

This package contains demos and commandline utilities for processing real-time audio (i.e. microphone) and audio files
using Cobra voice activity detection engine.

## Cobra

Cobra is a highly accurate and lightweight voice activity detection (VAD) engine.

## Compatibility

- Python 3.5+
- Runs on Linux (x86_64), Mac (x86_64), Windows (x86_64), Raspberry Pi (all variants), NVIDIA Jetson (Nano), and BeagleBone.

## AccessKey

Cobra requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cobra SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Installation


```console
sudo pip3 install pvcobrademo
```

## Usage

### Microphone Demo

The Microphone demo opens an audio stream from a microphone and detects voice activities. The following opens the default microphone:

```console
cobra_demo_mic --access_key {AccessKey}
```

where `{AccessKey}` is an AccessKey which should be obtained from [Picovoice Console](https://console.picovoice.ai/). It is possible that the default audio input device recognized by `pvrecorder` is not the one being used. There are a couple of debugging facilities baked into the demo application to solve this. First, type the following into the console:

```console
cobra_demo_mic --show_audio_devices
```

It provides information about various audio input devices on the box. On a Linux box, this is the console output:

```
'index': '0', 'name': 'HDA Intel PCH: ALC892 Analog (hw:0,0)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '2'
'index': '1', 'name': 'HDA Intel PCH: ALC892 Alt Analog (hw:0,2)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '2'
'index': '2', 'name': 'HDA NVidia: HDMI 0 (hw:1,3)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '3', 'name': 'HDA NVidia: HDMI 1 (hw:1,7)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '4', 'name': 'HDA NVidia: HDMI 2 (hw:1,8)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '5', 'name': 'HDA NVidia: HDMI 3 (hw:1,9)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '6', 'name': 'HDA NVidia: HDMI 0 (hw:2,3)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '7', 'name': 'HDA NVidia: HDMI 1 (hw:2,7)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '8', 'name': 'HDA NVidia: HDMI 2 (hw:2,8)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '9', 'name': 'HDA NVidia: HDMI 3 (hw:2,9)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '10', 'name': 'Logitech USB Headset: Audio (hw:3,0)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '1'
'index': '11', 'name': 'sysdefault', 'defaultSampleRate': '48000.0', 'maxInputChannels': '128'
'index': '12', 'name': 'front', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '13', 'name': 'surround21', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '14', 'name': 'surround40', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '15', 'name': 'surround41', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '16', 'name': 'surround50', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '17', 'name': 'surround51', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '18', 'name': 'surround71', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '19', 'name': 'pulse', 'defaultSampleRate': '44100.0', 'maxInputChannels': '32'
'index': '20', 'name': 'dmix', 'defaultSampleRate': '48000.0', 'maxInputChannels': '0'
'index': '21', 'name': 'default', 'defaultSampleRate': '44100.0', 'maxInputChannels': '32'
``` 

It can be seen that the last device (index 21) is considered default. But on this machine, a headset is being used as 
the input device which has an index of 10. After finding the correct index the demo application can be invoked as below:

```console
cobra_demo_mic --access_key {AccessKey} --audio_device_index 10
```

If the problem persists we suggest storing the recorded audio into a file for inspection. This can be achieved by:

```console
cobra_demo_mic --access_key {AccessKey} --audio_device_index 10 --output_path ~/test.wav
```

If after listening to stored file there is no apparent problem detected please open an issue.

### File Demo

It allows testing Cobra on a corpus of audio files. The demo is mainly useful for quantitative performance
benchmarking. It accepts 16kHz audio files. Cobra processes a single-channel audio stream if a stereo file is
provided it only processes the first (left) channel. The following processes a file looking for voice activities:

```console
cobra_demo_file --access_key {AccessKey} --input_audio_path ${AUDIO_PATH}
```
where `{AccessKey}` is an AccessKey which should be obtained from [Picovoice Console](https://console.picovoice.ai/). The threshold of the engine can be tuned using the `threshold` input argument:

```console
cobra_demo_file --access_key {AccessKey} --input_audio_path ${AUDIO_PATH} \
 --threshold 0.9
```

Threshold is a floating point number within `[0, 1]`. A higher threshold reduces the miss rate at the cost of increased false alarm rate.
