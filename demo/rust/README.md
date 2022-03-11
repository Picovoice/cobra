# Cobra Rust Demos

This package contains demos for processing real-time audio (i.e. microphone) and audio files using Cobra voice activity detection engine.

## AccessKey

Cobra requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cobra SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

NOTE: The working directory for the following `Cargo` commands is:

```console
cobra/demo/rust/filedemo  # File Demo
cobra/demo/rust/micdemo  # Microphone Demo
```

### File Demo

The file demo uses Cobra to scan for voice in a `.wav` file.
The demo is mainly useful for quantitative performance benchmarking.
Cobra processes a 16kHz, single-channel audio stream.
The following processes a file looking for voice activities:

```console
cargo run --release -- --access_key ACCESS_KEY --input_audio_path "path/to/input.wav"
```

Where `ACCESS_KEY` is an AccessKey which should be obtained from [Picovoice Console](https://console.picovoice.ai/).
The threshold of the engine can be tuned using the `threshold` input argument:

```console
cargo run --release -- --access_key ACCESS_KEY --input_audio_path "path/to/input.wav" --threshold 0.9
```

Threshold is a floating point number within `[0, 1]`. A higher threshold reduces the miss rate at the cost of increased false alarm rate.

### Microphone Demo

The Microphone demo opens an audio stream from a microphone and detects voice activities.
The following opens the default microphone:

```console
cargo run --release -- --access_key ACCESS_KEY
```

Where `ACCESS_KEY` is an AccessKey which should be obtained from [Picovoice Console](https://console.picovoice.ai/).

It is possible that the default audio input device is not the one you wish to use. There are a couple
of debugging facilities baked into the demo application to solve this. First, type the following into the console:

```console
cargo run --release -- --show_audio_devices
```

It provides information about various audio input devices on the box. Here is an example output:

```console
index: 0, device name: USB Audio Device
index: 1, device name: MacBook Air Microphone
``` 

You can use the device index to specify which microphone to use for the demo. For instance, if you want to use the USB Audio Device
in the above example, you can invoke the demo application as below:

```console
cargo run --release -- --access_key ACCESS_KEY --audio_device_index 0
```

If the problem persists we suggest storing the recorded audio into a file for inspection.
This can be achieved with:

```console
cargo run --release -- --access_key ACCESS_KEY --output_path ./test.wav
```

If after listening to stored file there is no apparent problem detected please open an issue.
