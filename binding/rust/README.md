# Cobra Voice Activity Detection Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cobra is a highly accurate and lightweight voice activity detection (VAD) engine.

## Compatibility

- Rust 1.54+
- Runs on Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64), Raspberry Pi, NVIDIA Jetson (Nano), and BeagleBone

## Installation
First you will need [Rust and Cargo](https://rustup.rs/) installed on your system.

To add the cobra library into your app, add `pv_cobra` to your apps `Cargo.toml` manifest:
```toml
[dependencies]
pv_cobra = "*"
```

## Usage

Create an instance of the engine:

```rust
use cobra::Cobra;

let access_key = "..."; // AccessKey provided by Picovoice Console (https://picovoice.ai/console/)
let cobra = Cobra::new(access_key);
```
where `access_key` is an AccessKey which should be obtained from [Picovoice Console](https://picovoice.ai/console/). `cobra` is an instance of Cobra that detects voice activities.

```rust
fn next_audio_frame() -> Vec<i16> {
    // get audio frame
}

let threshold = ... // Detection threshold within [0, 1]

loop {
    if let Ok(voice_probability) = cobra.process(&next_audio_frame()) {
        if voice_probability >= threshold {
            // Detection event!
        }
    }
}
```

## Demos

Check out the Cobra Rust demos [here](/demo/rust)
