# Cobra Demos for .NET

This project contains .NET command line demos for processing real-time audio (i.e. microphone) and audio files using the Cobra Voice Activity Detection engine.

## Cobra Voice Activity Detection Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cobra is an on-device streaming voice activity detection engine. Cobra is:

- Private; All voice processing runs locally.
- Accurate [[1]](https://picovoice.ai/docs/benchmark/vad/#results)
- Cross-Platform:
    - Linux (x86_64), macOS (x86_64, arm64), and Windows (x86_64, arm64)
    - Android and iOS
    - Chrome, Safari, Firefox, and Edge
    - Raspberry Pi (3, 4, 5)

## Requirements

- .NET 8.0

## Compatibility

- Linux (x86_64)
- macOS (x86_64, arm64)
- Windows (x86_64, arm64)
- Raspberry Pi:
  - 3 (32 and 64 bit)
  - 4 (32 and 64 bit)
  - 5 (32 and 64 bit)

## Installation

Both demos use [Microsoft's .NET 8.0](https://dotnet.microsoft.com/download).

Build with the dotnet CLI:

```console
dotnet build -c MicDemo.Release
dotnet build -c FileDemo.Release
```

## AccessKey

Cobra requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cobra SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

NOTE: File path arguments must be absolute paths. The working directory for the following dotnet commands is:

```console
cobra/demo/dotnet/CobraDemo
```

For both demos, you can use `--help/-h` to see the list of input arguements.

### Microphone Demo

The microphone demo opens an audio stream from a microphone and detects voice activities. The following opens the default microphone:

```console
dotnet run -c MicDemo.Release -- --access_key ${ACCESS_KEY}
```

`{AccessKey}` is an AccessKey which should be obtained from [Picovoice Console](https://console.picovoice.ai/). If you would like to select a specific audio device on your system, first run this to get the list of available devices:

```console
dotnet run -c MicDemo.Release -- --show_audio_devices
```

An example output looks like this:

```
index: 0, device name: USB Audio Device
index: 1, device name: MacBook Air Microphone
```

You can use the device index to specify which microphone to use for the demo. For instance, if you want to use the USB Audio Device in the above example, you can invoke the demo application as below:

```console
dotnet run -c MicDemo.Release -- \
--access_key ${ACCESS_KEY} \
--audio_device_index 0
```

If the demo isn't working as expected, it may be the quality of the audio delivered by the microphone. To check the quality, you can store the microphone audio as a file:

```console
dotnet run -c MicDemo.Release -- \
--access_key ${ACCESS_KEY} \
--audio_device_index 0 \
--output_path ./test.wav
```

If after listening to stored file there is no apparent problem detected please open an issue.

### File Demo

The file demo is for testing Cobra on a corpus of audio files. The demo is mainly useful for quantitative performance
benchmarking. It accepts 16kHz audio files. Cobra processes a single-channel audio stream if a stereo file is
provided it only processes the first (left) channel. The following processes a file looking for voice activities:

```console
dotnet run -c FileDemo.Release -- \
--input_audio_path ${AUDIO_PATH} \
--access_key ${ACCESS_KEY}
```

`{AccessKey}` is an AccessKey which should be obtained from [Picovoice Console](https://console.picovoice.ai/). The threshold of the engine can be tuned using the `threshold` input argument:

```console
dotnet run -c FileDemo.Release -- \
--input_audio_path ${AUDIO_PATH} \
--access_key ${ACCESS_KEY} \
--threshold 0.7
```

Threshold is a floating point number within `[0, 1]`. A higher threshold reduces the miss rate at the cost of increased false alarm rate.