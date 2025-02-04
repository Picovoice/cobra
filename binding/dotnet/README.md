# Cobra Binding for .NET

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

Platform compatible with .NET Framework 4.6.1+:

- Windows (x86_64)

Platforms compatible with .NET Core 2.0+:

- macOS (x86_64)
- Windows (x86_64)

Platform compatible with .NET 6.0+:

- Raspberry Pi:
  - 3 (32 and 64 bit)
  - 4 (32 and 64 bit)
  - 5 (32 and 64 bit)

- Linux (x86_64)
- macOS (arm64)
- Windows (arm64)

## Installation

You can install the latest version of Cobra by getting the latest [Cobra Nuget package](https://www.nuget.org/packages/Cobra/)
in Visual Studio or using the .NET CLI.

```console
dotnet add package Cobra
```

## AccessKey

Cobra requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cobra SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

Create an instance of the engine:

```csharp
using Pv;

const string accessKey = "${ACCESS_KEY}"; // Obtained from the Picovoice Console (https://console.picovoice.ai/)

Cobra cobra = new Cobra(accessKey);
```

Replace `${AccessKey}` with your AccessKey obtained from [Picovoice Console](https://console.picovoice.ai/). `cobra` is an instance of Cobra.

When initialized, the valid sample rate is given by `cobra.SampleRate`. Expected frame length (number of audio samples
in an input array) is `cobra.FrameLength`. The engine accepts 16-bit linearly-encoded PCM and operates on
single-channel audio.

Pass in frames of audio to get the probability of voice in each frame:

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

## Demos

The [Cobra dotnet demo project](https://github.com/Picovoice/cobra/tree/main/demo/dotnet) is a .NET command line application that allows for
processing real-time audio (i.e. microphone) and files using Cobra.