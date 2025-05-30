# Cobra

[![GitHub release](https://img.shields.io/github/release/Picovoice/Cobra.svg)](https://github.com/Picovoice/Cobra/releases)
[![GitHub](https://img.shields.io/github/license/Picovoice/cobra)](https://github.com/Picovoice/cobra/)

[![Crates.io](https://img.shields.io/crates/v/pv_cobra)](https://crates.io/crates/pv_cobra)<!-- markdown-link-check-disable-line -->
[![Maven Central](https://img.shields.io/maven-central/v/ai.picovoice/cobra-android?label=maven-central%20%5Bandroid%5D)](https://repo1.maven.org/maven2/ai/picovoice/cobra-android/)
[![npm](https://img.shields.io/npm/v/@picovoice/cobra-node?label=npm%20%5Bnode%5D)](https://www.npmjs.com/package/@picovoice/cobra-node)
[![npm](https://img.shields.io/npm/v/@picovoice/cobra-web?label=npm%20%5Bweb%5D)](https://www.npmjs.com/package/@picovoice/cobra-web)
[![CocoaPods](https://img.shields.io/cocoapods/v/Cobra-iOS)](https://cocoapods.org/pods/Cobra-iOS)
[![PyPI](https://img.shields.io/pypi/v/pvcobra)](https://pypi.org/project/pvcobra/)
[![Nuget](https://img.shields.io/nuget/v/Cobra)](https://www.nuget.org/packages/Cobra/)

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

[![Twitter URL](https://img.shields.io/twitter/url?label=%40AiPicovoice&style=social&url=https%3A%2F%2Ftwitter.com%2FAiPicovoice)](https://twitter.com/AiPicovoice)<!-- markdown-link-check-disable-line -->
[![YouTube Channel Views](https://img.shields.io/youtube/channel/views/UCAdi9sTCXLosG1XeqDwLx7w?label=YouTube&style=social)](https://www.youtube.com/channel/UCAdi9sTCXLosG1XeqDwLx7w)

Cobra is a highly-accurate and lightweight voice activity detection (VAD) engine.

## Table of Contents

- [Cobra](#cobra)
  - [Table of Contents](#table-of-contents)
  - [Demos](#demos)
    - [Python](#python-demos)
    - [.NET](#net-demos)
    - [C](#c-demos)
    - [Android](#android-demos)
    - [iOS](#ios-demos)
    - [Web](#web-demos)
    - [NodeJS](#nodejs-demos)
    - [Rust](#rust-demos)
  - [SDKs](#sdks)
    - [Python](#python)
    - [.NET](#net)
    - [C](#c)
    - [Android](#android)
    - [iOS](#ios)
    - [Web](#web)
    - [NodeJS](#nodejs)
    - [Rust](#rust)
  - [Releases](#releases)

## Demos

### Python Demos

Install the demo package:

```console
sudo pip3 install pvcobrademo
```

With a working microphone connected to your device, run the following in the terminal:

```console
cobra_demo_mic --access_key ${AccessKey}
```

Replace `${AccessKey}` with your AccessKey obtained from [Picovoice Console](https://console.picovoice.ai/). Cobra
will start processing the audio input from the microphone in realtime and output to the terminal when it detects any voice activity.

For more information about the Python demos go to [demo/python](demo/python).

### .NET Demos

From [demo/dotnet/CobraDemo](demo/dotnet/CobraDemo) build and run the demo:

```console
dotnet build -c MicDemo.Release
dotnet run -c MicDemo.Release -- --access_key ${ACCESS_KEY}
```

For more information about .NET demos go to [demo/dotnet](demo/dotnet).

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
AccessKey obtained from [Picovoice Console](https://console.picovoice.ai/), and `${INPUT_AUDIO_DEVICE}` with the index of
your  microphone device.

For more information about C demos go to [demo/c](demo/c).

### Android Demos

Using [Android Studio](https://developer.android.com/studio/index.html), open
[demo/android/Activity](demo/android/Activity) as an Android project and then run the application. Replace
`String ACCESS_KEY = "..."` inside
[MainActivity.java](demo/android/Activity/cobra-activity-demo-app/src/main/java/ai/picovoice/cobraactivitydemo/MainActivity.java)
with your AccessKey generated by [Picovoice Console](https://console.picovoice.ai/).

For more information about Android demos go to [demo/android](demo/android).

### iOS demos

Run the following from this directory to install the Cobra-iOS CocoaPod:

```console
pod install
```

Replace `let ACCESS_KEY = "..."` inside [ViewModel.swift](demo/ios/CobraDemo/CobraDemo/ViewModel.swift) with yours
obtained from [Picovoice Console](https://console.picovoice.ai/).

Then, using Xcode, open the generated CobraDemo.xcworkspace and run the application. Press the start button and start
talking. The background will change colour while you're talking.

For more information about iOS demos go to [demo/ios](demo/ios).

### Web Demos

From [demo/web](demo/web) run the following in the terminal:

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

### NodeJS Demos

Install the demo package:

```console
yarn global add @picovoice/cobra-node-demo
```

With a working microphone connected to your device, run the following in the terminal:

```console
cobra-mic-demo --access_key ${ACCESS_KEY}
```

Cobra will start processing the audio input from the microphone in realtime and output to the terminal when it detects any voice activity.

For more information about NodeJS demos go to [demo/nodejs](demo/nodejs).

### Rust Demos

> Rust SDKs will no longer be maintained after **July 15, 2025**. If you plan to use the Cobra Voice Activity Detection Rust SDK for commercial purposes, please [contact us](https://picovoice.ai/contact/).

From [demo/rust/micdemo](demo/rust/micdemo) build and run the demo:

```console
cargo run --release -- --access_key ${ACCESS_KEY}
```

For more information about Rust demos go to [demo/rust](demo/rust).


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

where `${AccessKey}` is an AccessKey which should be obtained from [Picovoice Console](https://console.picovoice.ai/).
When initialized, valid sample rate can be obtained using `handle.sample_rate`. The required frame length
(number of audio samples in an input array) is `handle.frame_length`. The object can be used to monitor incoming audio as follows:

```python
def get_next_audio_frame():
    pass

while True:
    voice_probability = handle.process(get_next_audio_frame())
```

Finally, when done be sure to explicitly release the resources using `handle.delete()`.

### .NET

Install the Cobra .NET SDK using NuGet or the dotnet CLI:

```console
dotnet add package Cobra
```

Create instances of the Cobra class:

```csharp
using Pv;

const string accessKey = "${ACCESS_KEY}"; // Obtained from the Picovoice Console (https://console.picovoice.ai/)

Cobra cobra = new Cobra(accessKey);
```

Once instantiated, `cobra` can process audio via its `.Process` method:

```csharp
short[] GetNextAudioFrame()
{
    // .. get audioFrame
    return audioFrame;
}

while(true)
{
    float voiceProbability = cobra.Process(frame.ToArray());
    // .. use probability to trigger other functionality
}
```

Cobra will have its resources freed by the garbage collector, but to have resources freed immediately after use,
wrap it in a using statement:

```csharp
using(Cobra cobra = new Cobra(accessKey))
{
    // .. Cobra usage here
}
```

### C

[include/pv_cobra.h](include/pv_cobra.h) header file contains relevant information. Build an instance of the object:

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

String accessKey = // .. AccessKey provided by Picovoice Console (https://console.picovoice.ai/)
try {
    handle = new Cobra(accessKey);
} catch (CobraException e) {
    // handle error
}
```

When initialized, valid sample rate can be obtained using `handle.getSampleRate()`. The required frame length
(number of audio samples in an input array) is `handle.getFrameLength()`. The object can be used to monitor incoming
audio as follows:

```java
short[] getNextAudioFrame(){

while(true) {
    try {
        final float voiceProbability = handle.process(getNextAudioFrame());
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

let accessKey : String = // .. AccessKey provided by Picovoice Console (https://console.picovoice.ai/)
do {
    handle = try Cobra(accessKey: accessKey)
} catch { }

func getNextAudioFrame() -> [Int16] {
    // .. get audioFrame
    return audioFrame;
}

while true {
    do {
        let voiceProbability = try handle.process(getNextAudioFrame())
    } catch { }
}
```

Finally, when done be sure to explicitly release the resources using `handle.delete()`.

### Web

Install the web SDK using yarn:

```console
yarn add @picovoice/cobra-web
```

or using npm:

```console
npm install --save @picovoice/cobra-web
```

Create an instance of the engine using `CobraWorker` and run the VAD on an audio input stream:

```typescript
import { CobraWorker } from "@picovoice/cobra-web";

function voiceProbabilityCallback(voiceProbability: number) {
  ... // use voice probability figure
}

function getAudioData(): Int16Array {
  ... // function to get audio data
  return new Int16Array();
}

const cobra = await CobraWorker.create(
  "${ACCESS_KEY}",
  voiceProbabilityCallback
);

for (; ;) {
  cobra.process(getAudioData());
  // break on some condition
}
```

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/).

When done, release the resources allocated to Cobra using `cobra.release()`.

### NodeJS

Install NodeJS SDK:

```console
yarn add @picovoice/cobra-node
```

Create instances of the Cobra class:

```javascript
const { Cobra } = require("@picovoice/cobra-node");

const accessKey = "${ACCESS_KEY}"; // Obtained from the Picovoice Console (https://console.picovoice.ai/)
const cobra = new Cobra(accessKey);
```

When instantiated, `cobra` can process audio via its `.process` method.

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

When done be sure to release resources using `release()`:

```javascript
cobra.release();
```

### Rust

> Rust SDKs will no longer be maintained after **July 15, 2025**. If you plan to use the Cobra Voice Activity Detection Rust SDK for commercial purposes, please [contact us](https://picovoice.ai/contact/).

Create an instance of the engine and detect voice activity:

```rust
use cobra::Cobra;

let cobra = Cobra::new("${ACCESS_KEY}");

fn next_audio_frame() -> Vec<i16> {
    // get audio frame
}

loop {
    if let Ok(voice_probability) = cobra.process(&next_audio_frame()) {
      // ...
    }
}
```


## Releases

### v3.0.0 - October 26th, 2023

- Improvements to error reporting
- Upgrades to authorization and authentication system
- Various bug fixes and improvements
- Node min support bumped to 16

### v1.2.0 - January 27th, 2023

- Updated Cobra engine for improved accuracy and performance
- iOS minimum requirement moved to iOS 11.0
- Minor bug fixes

### v1.1.0 - January 21st, 2022

- Improved types for web binding
- Various bug fixes and improvements

### v1.0.0 - October 8th, 2021

- Initial release
