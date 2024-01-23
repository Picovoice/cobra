# Cobra Voice Activity Detection Demos

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

## Cobra

Cobra is an on-device voice activity detection engine. Cobra is:

- Private; All voice processing runs locally.
- Accurate [[1]](https://picovoice.ai/docs/benchmark/vad/#results)
- Cross-Platform:
    - Linux (x86_64), macOS (x86_64, arm64), and Windows (x86_64)
    - Android and iOS
    - Chrome, Safari, Firefox, and Edge
    - Raspberry Pi (4, 3) and NVIDIA Jetson Nano

## Compatibility

- Node.js 12+
- Runs on Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64), Raspberry Pi (4, 3), and NVIDIA Jetson Nano.

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

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console and `${AUDIO_PATH}` with a path to an audio file for which you
wish to detect voice activity.

### Microphone Demo

You need a working microphone connected to your machine for this demo. Run the following in the terminal:

```console
cobra-mic-demo --access_key ${ACCESS_KEY}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console.

Now start recording and when done press `ENTER` key.
