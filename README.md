# Cobra

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cobra is a highly-accurate and lightweight voice activity detection (VAD) engine.

## Table of Contents

- [Cobra](#cobra)
  - [Table of Contents](#table-of-contents)
  - [Demos](#demos)
    - [Python Demos](#python-demos)
    - [C Demos](#c-demos)
    - [Android Demos](#android-demos)
    - [iOS demos](#ios-demos)
    - [Web Demos](#web-demos)
  - [SDKs](#sdks)
    - [Python](#python)
    - [C](#c)
    - [Android](#android)
    - [iOS](#ios)
    - [Web](#web)
      - [Vanilla JavaScript and HTML (CDN Script Tag)](#vanilla-javascript-and-html-cdn-script-tag)
      - [Vanilla JavaScript and HTML (ES Modules)](#vanilla-javascript-and-html-es-modules)
  - [Releases](#releases)
    - [v1.0.0 Oct 8th, 2021](#v100-oct-8th-2021)

## Demos

### Python Demos

Install [PyAudio](https://people.csail.mit.edu/hubert/pyaudio/) and then the demo package:

```console
sudo pip3 install pvcobrademo
```

With a working microphone connected to your device run the following in the terminal:

```console
cobra_demo_mic --access_key ${AccessKey}
```

Replace `${AccessKey}` with your AccessKey obtained from [Picovoice Console](https://picovoice.ai/console/). Cobra
starts processing the audio input from the microphone in realtime and outputs to the terminal when it detects any voice activities.

For more information about the Python demos go to [demo/python](/demo/python).

### C Demos

Build the demo:

```console
cmake -S demo/c/ -B demo/c/build && cmake --build demo/c/build --target cobra_demo_mic
```

To list the available audio input devices:

```console
./demo/c/build/cobra_demo_mic -s
```

To run the demo:

```console
./demo/c/build/cobra_demo_mic -l ${LIBRARY_PATH} -a ${ACCESS_KEY} -d ${AUDIO_DEVICE_INDEX}
```

Replace `${LIBRARY_PATH}` with path to appropriate library available under [lib](/lib), Replace `${ACCESS_KEY}` with 
AccessKey obtained from [Picovoice Console](https://picovoice.ai/console/), and `${INPUT_AUDIO_DEVICE}` with the index of
your  microphone device.

For more information about C demos go to [demo/c](/demo/c).

### Android Demos

Using [Android Studio](https://developer.android.com/studio/index.html), open
[demo/android/Activity](/demo/android/Activity) as an Android project and then run the application. Replace
`String ACCESS_KEY = "..."` inside
[MainActivity.java](/demo/android/Activity/cobra-activity-demo-app/src/main/java/ai/picovoice/cobraactivitydemo/MainActivity.java)
with your AccessKey generated by [Picovoice Console](https://picovoice.ai/console/).

For more information about Android demos go to [demo/android](/demo/android).

### iOS demos

Run the following from this directory to install the Cobra-iOS CocoaPod:

```console
pod install
```

Replace `let ACCESS_KEY = "..."` inside [ViewModel.swift](/demo/ios/CobraDemo/CobraDemo/ViewModel.swift) with yours 
obtained from [Picovoice Console](https://picovoice.ai/console/).

Then, using Xcode, open the generated CobraDemo.xcworkspace and run the application. Press the start button and start
talking. The background will change colour while you're talking.

For more information about iOS demos go to [demo/ios](/demo/ios).

### Web Demos

From [demo/web](/demo/web) run the following in the terminal:

```console
yarn
yarn start
```

(or)

```console
npm install
npm run start
```

Open `http://localhost:5000` in your browser to try the demo.

## SDKs

### Python

Install the Python SDK:

```console
pip3 install pvcobra
```

The SDK exposes a factory method to create instances of the engine:

```python
import pvcobra

handle = pvcobra.create(access_key=${AccessKey})
```

where `${AccessKey}` is an AccessKey which should be obtained from [Picovoice Console](https://picovoice.ai/console/).
When initialized, valid sample rate can be obtained using `handle.sample_rate`. The required frame length
(number of audio samples in an input array) is `handle.frame_length`. The object can be used to monitor incoming audio as follows:

```python
def get_next_audio_frame():
    pass

while True:
    voice_probability = handle.process(get_next_audio_frame())
```

Finally, when done be sure to explicitly release the resources using `handle.delete()`.

### C

[include/pv_cobra.h](/include/pv_cobra.h) header file contains relevant information. Build an instance of the object:

```c
    pv_cobra_t *handle = NULL;
    pv_status_t status = pv_cobra_init(${ACCESS_KEY}, &handle);
    if (status != PV_STATUS_SUCCESS) {
        // error handling logic
    }
```

Replace `${ACCESS_KEY}` with the AccessKey obtained from Picovoice Console. Now the `handle` can be used to monitor
incoming audio stream. Cobra accepts single channel, 16-bit linearly-encoded  PCM audio. The sample rate can be
retrieved using `pv_sample_rate()`. Finally, Cobra accepts input audio in  consecutive chunks (aka frames) the length of
each frame can be retrieved using `pv_cobra_frame_length()`.

```c
extern const int16_t *get_next_audio_frame(void);

while (true) {
    const int16_t *pcm = get_next_audio_frame();
    float is_voiced = 0.f;
    const pv_status_t status = pv_cobra_process(handle, pcm, &is_voiced);
    if (status != PV_STATUS_SUCCESS) {
        // error handling logic
    }
}
```

Finally, when done be sure to release the acquired resources:

```c
pv_cobra_delete(handle);
```

### Android

Create an instance of the engine

```java
import ai.picovoice.cobra.Cobra;
import ai.picovoice.cobra.CobraException;

String appID = // .. AppID provided by Picovoice Console (https://picovoice.ai/console/)
try {
    handle = new Cobra(appID);
} catch (CobraException e) {
    // handle error
}
```

When initialized, valid sample rate can be obtained using `handle.getSampleRate()`. The required frame length (number of audio samples in an input array) is `handle.getFrameLength()`. The object can be used to monitor incoming audio as follows:

```java
short[] getNextAudioFrame(){

float threshold = // .. # detection threshold within [0, 1]

while(true) {
    try {
        float voiceProbability = handle.process(getNextAudioFrame());
        if(voiceProbability >= threshold) {
            // .. detection event callback
        }
    } catch (CobraException e) { }
}
```

Finally, when done be sure to explicitly release the resources using `handle.delete()`.

### iOS

To import the Cobra iOS binding into your project, add the following line to your Podfile and run `pod install`:

```ruby
pod 'Cobra-iOS'
```

Create an instance of the engine

```swift
import Cobra

let appID : String = // .. AppID provided by Picovoice Console (https://picovoice.ai/console/)
do {
    handle = try Cobra(appID: appID)
} catch { }

let threshold = // .. detection threshold within [0, 1]

func getNextAudioFrame() -> [Int16] {
    // .. get audioFrame
    return audioFrame;
}

while true {
    do {
        let voiceProbability = try handle.process(getNextAudioFrame())
        if voiceProbability >= threshold {
            // .. detection made!
        }
    } catch { }
}
```

Finally, when done be sure to explicitly release the resources using `handle.delete()`.

### Web

Cobra is available on modern web browsers (i.e., not Internet Explorer) via [WebAssembly](https://webassembly.org/). Cobra is provided pre-packaged as a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) to allow it to perform processing off the main thread.

The Cobra package [@picovoice/cobra-web-worker](https://www.npmjs.com/package/@picovoice/cobra-web-worker) can be used with the [@picovoice/web-voice-processor](https://www.npmjs.com/package/@picovoice/web-voice-processor). Microphone audio is handled via the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) and is abstracted by the WebVoiceProcessor, which also handles down-sampling to the correct format.

#### Vanilla JavaScript and HTML (CDN Script Tag)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <script src="https://unpkg.com/@picovoice/cobra-web-worker/dist/iife/index.js"></script>
    <script src="https://unpkg.com/@picovoice/web-voice-processor/dist/iife/index.js"></script>
    <script type="application/javascript">
      function cobraCallback(voiceProbability) {
        const threshold = 0.8;
        if voiceProbability >= threshold {
          const timestamp = new Date();
          console.log("Voice detected with probability of " +
            voiceProbability.toFixed(2) +
            " at " +
            timestamp.toString()
          );
        }
      }

      async function startCobra() {
        const appId = // AppID string provided by Picovoice Console (picovoice.ai/console/)
        const cobraWorker = await CobraWorkerFactory.create(
          appId,
          cobraCallback
        );

        console.log("Cobra worker ready!");

        console.log("WebVoiceProcessor initializing. Microphone permissions requested ...");

        try {
          let webVp = await window.WebVoiceProcessor.WebVoiceProcessor.init({
            engines: [cobraWorker],
          });
          console.log("WebVoiceProcessor ready and listening!");
        } catch (e) {
          console.log("WebVoiceProcessor failed to initialize: " + e);
        }
      }

      document.addEventListener("DOMContentLoaded", function () {
        startCobra();
      });
    </script>
  </head>
  <body></body>
</html>
```

#### Vanilla JavaScript and HTML (ES Modules)

```console
yarn add @picovoice/cobra-web-worker @picovoice/web-voice-processor
```

(or)

```console
npm install @picovoice/cobra-web-worker @picovoice/web-voice-processor
```

```javascript
import { WebVoiceProcessor } from "@picovoice/web-voice-processor"
import { CobraWorkerFactory } from "@picovoice/cobra-web-worker";

function cobraCallback(voiceProbability) {
  const threshold = 0.8;
  if voiceProbability >= threshold {
    const timestamp = new Date();
    console.log("Voice detected with probability of " +
      voiceProbability.toFixed(2) +
      " at " +
      timestamp.toString()
    );
  }
}

async function startCobra() {
  const appId = //AppID string provided by Picovoice Console (picovoice.ai/console/)
  const cobraWorker = await CobraWorkerFactory.create(
      appId,
      cobraCallback
  );

  const webVp =
      await WebVoiceProcessor.init({
        engines: [cobraWorker],
        start: true,
      });
}

startCobra()
```

## Releases

### v1.0.0 Oct 8th, 2021

- Initial release.
