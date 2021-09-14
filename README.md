# Cobra

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cobra is a highly-accurate and lightweight voice activity detection (VAD) engine.

## Table of Contents

- [Cobra](#cobra)
  - [Table of Contents](#table-of-contents)
  - [Demos](#demos)
    - [Python Demos](#python-demos)
    - [Android Demos](#android-demos)
    - [iOS demos](#ios-demos)
    - [C Demos](#c-demos)
  - [SDKs](#sdks)
    - [Python](#python)
    - [Android](#android)
    - [iOS](#ios)
    - [C](#c)
  - [Releases](#releases)

## Demos

### Python Demos

Install [PyAudio](https://people.csail.mit.edu/hubert/pyaudio/) and then the demo package:

```console
sudo pip3 install pvcobrademo
```

With a working microphone connected to your device run the following in the terminal:

```console
cobra_demo_mic
```

The engine starts processing the audio input from the microphone in realtime and outputs to the terminal when it detects any voice activities.

For more information about Python demos go to [demo/python](/demo/python).

### Android Demos

Using [Android Studio](https://developer.android.com/studio/index.html), open
[demo/android/Activity](/demo/android/Activity) as an Android project and then run the application.

### iOS demos

Before building the demo app, run the following from this directory to install the Cobra-iOS Cocoapod:

```console
pod install
```

Then, using Xcode, open the generated CobraDemo.xcworkspace and run the application. Press the start button and start talking. The background will change colour while you're talking.

### C Demos

[Microphone demo](/demo/c/cobra_demo_mic.c) runs on Linux-based systems (e.g., Ubuntu, Raspberry Pi, and BeagleBone).
Build the demo:

```console
gcc -std=c99 -O3 -o demo/c/cobra_demo_mic -I include/  demo/c/cobra_demo_mic.c -ldl -lasound
```

Find the name of audio input device (microphone) on your computer using `arecord -L` and then from the root of the
repository run the demo:

```console
./demo/c/cobra_demo_mic ${LIBRARY_PATH} ${THRESHOLD} ${INPUT_AUDIO_DEVICE}
```

Replace `${LIBRARY_PATH}` with path to appropriate library available under [lib](/lib), Replace `${THRESHOLD}` with voice
detection threshold (a floating-point number within [0, 1]), and `${INPUT_AUDIO_DEVICE}` with  the name of your
microphone device. The demo opens an audio  stream and detects speech signal.

For more information about C demos go to [demo/c](/demo/c).

## SDKs

### Python

Install the Python SDK:

```console
pip3 install pvcobra
```

The SDK exposes a factory method to create instances of the engine:

```python
import pvcobra

handle = pvcobra.create()
```

When initialized, valid sample rate can be obtained using `handle.sample_rate`. The required frame length (number of audio samples in an input array) is `handle.frame_length`. The object can be used to monitor incoming audio as follows:

```python
import pvcobra

handle = pvcobra.create()

def get_next_audio_frame():
    pass

threshold = ... # detection threshold within [0, 1]

while True:
    voice_probability = handle.process(get_next_audio_frame())
    if voice_probability >= threshold:
        # detection event callback
        pass
```

Finally, when done be sure to explicitly release the resources using `handle.delete()`.

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

### C

[include/pv_cobra.h](/include/pv_cobra.h) header file contains relevant information. Build an instance of the object:

```c
    pv_cobra_t *handle = NULL;
    pv_status_t status = pv_cobra_init(&handle);
    if (status != PV_STATUS_SUCCESS) {
        // error handling logic
    }
```

Now the `handle` can be used to monitor incoming audio stream. Cobra accepts single channel, 16-bit linearly-encoded
PCM audio. The sample rate can be retrieved using `pv_sample_rate()`. Finally, Cobra accepts input audio in
consecutive chunks (aka frames) the length of each frame can be retrieved using `pv_cobra_frame_length()`.

```c
extern const int16_t *get_next_audio_frame(void);

const float threshold = ... // detection threshold within [0, 1]

while (true) {
    const int16_t *pcm = get_next_audio_frame();
    float is_voiced = 0.f;
    const pv_status_t status = pv_cobra_process(handle, pcm, &is_voiced);
    if (status != PV_STATUS_SUCCESS) {
        // error handling logic
    }
    if (is_voiced >= threshold) {
        // detection event callback
    }
}
```

Finally, when done be sure to release the acquired resources:

```c
pv_cobra_delete(handle);
```

## Releases

### v1.0.0 June Sep 14, 2021
- Initial release.
