# C Demos

## Compatibility

You need a C99-compatible compiler to build these demos.

## Requirements

- The demo requires [CMake](https://cmake.org/) version 3.4 or higher.
- **For Windows Only**: [MinGW](http://mingw-w64.org/doku.php) is required to build the demo.

# Microphone Demo

The Cobra microphone demo opens an audio stream and detects the presence of speech.

**Note**: the following commands are run from the root of the repo

## Build

Use CMake to build the Cobra microphone demo target:

```console
cmake -S demo/c/. -B demo/c/build && cmake --build demo/c/build --target cobra_demo_mic
```

## Usage

Running the executable without any command-line arguments prints the usage info to the console:

```console
./demo/c/build/cobra_demo_mic
usage : ./demo/c/build/cobra_demo_mic library_path app_id threshold audio_device_index
        ./demo/c/build/cobra_demo_mic --show_audio_devices
```

To list the available audio input devices:

```console
./demo/c/build/cobra_demo_mic --show_audio_devices
```

To run the cobra microphone demo:

```console
./demo/c/build/cobra_demo_mic ${LIBRARY_PATH} ${APP_ID} ${THRESHOLD} ${AUDIO_DEVICE_INDEX}
```

Replace `${LIBRARY_PATH}` with path to appropriate library available under [lib](/lib), `${THRESHOLD}` with a voice-detection
threshold (a floating-point number within [0, 1]), and `${AUDIO_DEVICE_INDEX}` with the index of the audio device
you wish to capture audio with. An `${AUDIO_DEVICE_INDEX}` of -1 will provide you with your system's default recording device.

You must also provide an AppID in place of `${APP_ID}`, which can be obtained from the [Picovoice Console](https://console.picovoice.ai/).

# File Demo

The file demo will analyze an audio file for the presence of voice and print the probability of voice for each
frame of audio. This demo expects a single-channel WAV file with a sampling rate of 16000 and 16-bit linear PCM encoding.

**Note**: the following commands are run from the root of the repo

## Build

Use CMake to build the Cobra file demo target:

```console
cmake -S demo/c/. -B demo/c/build && cmake --build demo/c/build --target cobra_demo_file
```

## Usage

Run the demo:

```console
./demo/c/build/cobra_demo_file ${LIBRARY_PATH} ${APP_ID} ${INPUT_AUDIO_FILE}
```

Replace `${LIBRARY_PATH}` with the path to the appropriate Cobra library available under [lib](/lib), `${APP_ID}` with a
Picovoice AppID obtained from the [Picovoice Console](https://console.picovoice.ai/), and `${INPUT_AUDIO_FILE}` with the
path to the audio file you wish to analyze.
