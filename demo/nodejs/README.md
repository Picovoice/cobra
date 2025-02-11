# Cobra Voice Activity Detection Demos

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

## Cobra

Cobra is an on-device voice activity detection engine. Cobra is:

- Private; All voice processing runs locally.
- Accurate [[1]](https://picovoice.ai/docs/benchmark/vad/#results)
- Cross-Platform:
    - Linux (x86_64), macOS (x86_64, arm64), and Windows (x86_64, arm64)
    - Android and iOS
    - Chrome, Safari, Firefox, and Edge
    - Raspberry Pi (3, 4, 5)

## Compatibility

- Node.js 18+
- Runs on Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64, arm64), and Raspberry Pi (3, 4, 5).

## Installation

```console
npm install -g @picovoice/cobra-node-demo
```

## AccessKey

Cobra requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cobra SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

### File Demo

Run the following in the terminal:

```console
cobra-file-demo --access_key ${ACCESS_KEY} --input_audio_file_path ${AUDIO_PATH}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console and `${AUDIO_PATH}` with a path to an audio file you
wish to use for voice activity detection.

The threshold of the engine can be tuned using the `threshold` input argument:

```console
cobra-file-demo --access_key ${ACCESS_KEY} --input_audio_file_path ${AUDIO_PATH} --threshold ${DETECTION_THRESHOLD}
```

Threshold is a floating point number within `[0, 1]`. A higher threshold reduces the miss rate at the cost of increased false alarm rate.

### Microphone Demo

You need a working microphone connected to your machine for this demo. Run the following in the terminal:

```console
cobra-mic-demo --access_key ${ACCESS_KEY}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console.

To stop recording, press `Ctrl + C` or hit the `ENTER` key.
