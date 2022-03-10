# Cobra iOS Demo

## AccessKey

Cobra requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cobra SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret. 
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Setup

1. Before building the demo app, run the following from this directory to install the Cobra Cocoapod:
```console
pod install
```
2. Replace `let ACCESS_KEY = "..."` inside [`ViewModel.swift`](/demo/ios/CobraDemo/CobraDemo/ViewModel.swift) with your AccessKey.
```swift
private let ACCESS_KEY = "YOUR_ACCESS_KEY_HERE"
```

## Usage

Open the CobraDemo XCode project and build. Launch the demo on a simulator or an physical iOS device.

1. Press the Start button
2. Start talking. The app background will change to indicate that voice activity was detected above the threshold.
