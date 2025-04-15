# C Demos

## Compatibility

You need a C99-compatible compiler to build these demos.

## AccessKey

Cobra requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cobra SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Requirements

- The demo requires [CMake](https://cmake.org/) version 3.13 or higher.
- **For Windows Only**: [MinGW](http://mingw-w64.org/) is required to build the demo.

# Microphone Demo

The Cobra microphone demo opens an audio stream and detects the presence of speech.

**Note**: the following commands are run from the root of the repo

## Build

Use CMake to build the Cobra microphone demo target:

```console
cmake -S demo/c/ -B demo/c/build -DPV_RECORDER_PLATFORM={PV_RECORDER_PLATFORM}
cmake --build demo/c/build --target cobra_demo_mic
```

The {PV_RECORDER_PLATFORM} variable will set the compilation flags for the given platform. Exclude this variable to get a list of possible values.

## Usage

Running the executable without any command-line arguments prints the usage info to the console:

```console
Usage: ./cobra_demo_mic [-s] [-l LIBRARY_PATH -a ACCESS_KEY -d AUDIO_DEVICE_INDEX]
```

To list the available audio input devices:

```console
./demo/c/build/cobra_demo_mic -s
```

To run the cobra microphone demo:

```console
./demo/c/build/cobra_demo_mic -l ${LIBRARY_PATH} -a ${ACCESS_KEY} -d ${AUDIO_DEVICE_INDEX}
```

Replace `${LIBRARY_PATH}` with path to appropriate library available under [lib](/lib), `${ACCESS_KEY}` with AccessKey
obtained from [Picovoice Console](https://console.picovoice.ai/), and `${AUDIO_DEVICE_INDEX}` with the index of the
audio device  you wish to capture audio with. An `${AUDIO_DEVICE_INDEX}` of -1 will provide you with your system's
default recording device.

# File Demo

The file demo will analyze an audio file for the presence of voice and print the probability of voice for each
frame of audio. This demo expects a single-channel WAV file with a sampling rate of 16000 and 16-bit linear PCM encoding.

**Note**: the following commands are run from the root of the repo

## Build

Use CMake to build the Cobra file demo target:

```console
cmake -S demo/c/ -B demo/c/build -DPV_RECORDER_PLATFORM={PV_RECORDER_PLATFORM}
cmake --build demo/c/build --target cobra_demo_file
```

The {PV_RECORDER_PLATFORM} variable will set the compilation flags for the given platform. Exclude this variable to get a list of possible values.

## Usage

Run the demo:

```console
./demo/c/build/cobra_demo_file -l ${LIBRARY_PATH} -a ${ACCESS_KEY} -w ${INPUT_WAV_FILE}
```

Replace `${LIBRARY_PATH}` with the path to the appropriate Cobra library available under [lib](/lib), `${ACCESS_KEY}` with a
Picovoice AccessKey obtained from the [Picovoice Console](https://console.picovoice.ai/), and `${INPUT_WAV_FILE}` with the
path to the WAV file you wish to analyze.
