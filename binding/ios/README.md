# Cobra Voice Activity Detection Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cobra is a highly accurate and lightweight voice activity detection (VAD) engine.

## Compatibility

- iOS 9.0 or higher

## Installation

The Cobra iOS binding is available via [Cocoapods](https://cocoapods.org/pods/Rhino-iOS). To import it into your iOS project, add the following line to your Podfile and run `pod install`: 

```ruby
pod 'Cobra-iOS'
```

## Permissions

To enable recording with your iOS device's microphone you must add the following to your app's `Info.plist` file:
```xml
<key>NSMicrophoneUsageDescription</key>
<string>[Permission explanation]</string>
```

## Usage

Create an instance of the engine

```swift
import Cobra

let accessKey : String = // .. accessKey provided by Picovoice Console (https://picovoice.ai/console/)
do {
    handle = try Cobra(accessKey: accessKey)
} catch { }
```

`handle` is an instance of Cobra that detects voice activities.

```swift
func getNextAudioFrame() -> [Int16] {
    // .. get audioFrame
    return audioFrame;
}

let threshold = // .. detection threshold within [0, 1] 
while true {
    do {
        let voiceProbability = try handle.process(getNextAudioFrame())
        if voiceProbability >= threshold {
            // .. detection made!
        }
    } catch { }
}
```

For `process` to work correctly, the audio data must be in the audio format required by Picovoice.
The required audio format is found by using `Cobra.sampleRate` to get the required sample rate and `Cobra.frameLength` to get the required number of samples per input frame. Audio must be single-channel and 16-bit linearly-encoded.

When done, resources have to be released explicitly:

```swift
handle.delete()
```

## Demo App

For example usage refer to our [iOS demo application](/demo/ios).
