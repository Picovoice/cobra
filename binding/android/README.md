# Cobra Voice Activity Detection Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cobra is a highly accurate and lightweight voice activity detection (VAD) engine.

## Compatibility

- Android SDK 21 or higher

## Installation

Cobra can be found on Maven Central. To include the package in your Android project, ensure you have included `mavenCentral()`
in your top-level `build.gradle` file and then add the following to your app's `build.gradle`:

```groovy
dependencies {
    // ...
    implementation 'ai.picovoice:cobra-android:${version}'
}
```

## AccessKey

Cobra requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cobra SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret. 
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Permissions

To enable recording with your Android device's microphone and to communicate to the license server,
you must add the following lines to your `AndroidManifest.xml` file:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```
## Usage

Create an instance of the engine

```java
import ai.picovoice.cobra.Cobra;
import ai.picovoice.cobra.CobraException;

String accessKey = // .. AccessKey obtained from Picovoice Console (https://picovoice.ai/console/)
try {
    handle = new Cobra(accessKey);
} catch (CobraException e) {
    // handle error
}
```

`handle` is an instance of Cobra that detects voice activities.

```java
short[] getNextAudioFrame(){
    // .. get audioFrame
    return audioFrame;
}

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

When done, resources have to be released explicitly:

```java
handle.delete()
```

## Demos

For example usage refer to the [Activity demo](/demo/android/Activity)
