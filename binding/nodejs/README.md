# Cobra Binding for Node.js

## Cobra Voice Activity Detection Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cobra is an on-device streaming voice activity detection engine. Cobra is:

- Private; All voice processing runs locally.
- Accurate [[1]](https://picovoice.ai/docs/benchmark/vad/#results)
- Cross-Platform:
    - Linux (x86_64), macOS (x86_64, arm64), and Windows (x86_64)
    - Android and iOS
    - Chrome, Safari, Firefox, and Edge
    - Raspberry Pi (2, 3, 4, 5) NVIDIA Jetson Nano, and BeagleBone

## Compatibility

- Node.js 16+
- Runs on Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64), Raspberry Pi (2, 3, 4, 5), NVIDIA Jetson Nano, and BeagleBone.

## Installation

```console
npm install @picovoice/cobra-node
```

## AccessKey

Cobra requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cobra SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

### Usage

Create an instance of the engine and detect voice activity in the audio:

Replace `${AccessKey}` with your AccessKey obtained from [Picovoice Console](https://console.picovoice.ai/). `cobra` is
an instance of Cobra.

```javascript
const { Cobra } = require("@picovoice/cobra-node");

const accessKey = "${ACCESS_KEY}"; // Obtained from the Picovoice Console (https://console.picovoice.ai/)
const cobra = new Cobra(accessKey);
```

Once initialized, the valid sample rate is given by `cobra.sampleRate`. The expected frame length (number of audio samples
in an input array) is `cobra.frameLength`. The engine accepts 16-bit linearly-encoded PCM and operates on
single-channel audio.

```javascript
function getNextAudioFrame() {
  // ...
  return audioFrame;
}

while (true) {
  const audioFrame = getNextAudioFrame();
  const voiceProbability = cobra.process(audioFrame);
  console.log(voiceProbability);
}
```

Finally, when done be sure to explicitly release the resources using
`cobra.release()`.

## Demos

The [Cobra Node.js demo package](https://www.npmjs.com/package/@picovoice/cobra-node-demo) provides command-line utilities for processing audio using Cobra.
