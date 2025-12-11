#! /usr/bin/env node
//
// Copyright 2024 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
"use strict";

const { program } = require("commander");
const readline = require("readline");

const { PvRecorder } = require("@picovoice/pvrecorder-node");

const {
  Cobra,
  CobraActivationLimitReachedError,
} = require("@picovoice/cobra-node");

program
  .requiredOption(
    "-a, --access_key <string>",
    "AccessKey obtain from the Picovoice Console (https://console.picovoice.ai/)"
  )
  .option(
    "-d, --device <string>",
    "Device to run inference on (`best`, `cpu:{num_threads}` or `gpu:{gpu_index}`). Default: selects best device"
  )
  .option(
    "-l, --library_file_path <string>",
    "absolute path to cobra dynamic library"
  )
  .option(
    "-i, --audio_device_index <number>",
    "index of audio device to use to record audio",
    Number,
    -1
  )
  .option(
    "-z, --show_inference_devices",
    "Print devices that are available to run Cobra inference.",
    false)
  .option("-s, --show_audio_devices", "show the list of available devices");

if (process.argv.length < 1) {
  program.help();
}
program.parse(process.argv);

let isInterrupted = false;

async function micDemo() {
  let accessKey = program["access_key"];
  let device = program["device"];
  let libraryFilePath = program["library_file_path"];
  let audioDeviceIndex = program["audio_device_index"];
  let showAudioDevices = program["show_audio_devices"];

  let showAudioDevicesDefined = showAudioDevices !== undefined;

  if (showAudioDevicesDefined) {
    const devices = PvRecorder.getAvailableDevices();
    for (let i = 0; i < devices.length; i++) {
      console.log(`index: ${i}, device name: ${devices[i]}`);
    }
    process.exit();
  }

  const showInferenceDevices = program["show_inference_devices"];
  if (showInferenceDevices) {
    console.log(Cobra.listAvailableDevices().join('\n'));
    process.exit();
  }

  if (accessKey === undefined || audioPath === undefined) {
    console.error(
      "`--access_key` and `--input_audio_file_path` are required arguments"
    );
    return;
  }

  let engineInstance = new Cobra(accessKey, {
    device: device,
    libraryPath: libraryFilePath,
  });

  const recorder = new PvRecorder(engineInstance.frameLength, audioDeviceIndex);
  recorder.start();

  console.log(`Using device: ${recorder.getSelectedDevice()}`);

  console.log("Listening... Press `ENTER` to stop:");

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  process.stdin.on("keypress", (key, str) => {
    if (
      str.sequence === "\r" ||
      str.sequence === "\n" ||
      (str.ctrl && str.name === "c")
    ) {
      isInterrupted = true;
    }
  });

  while (!isInterrupted) {
    const pcm = await recorder.read();
    try {
      const voiceProbability = engineInstance.process(pcm);
      const percentage = voiceProbability * 100;
      const barLength = Math.floor((percentage / 10) * 3);
      const emptyLength = 30 - barLength;
      const spacer = ` `.repeat(3 - percentage.toFixed(0).length);

      process.stdout.write(
        `\r[${spacer}${percentage.toFixed(0)}]|${"█".repeat(
          barLength
        )}${" ".repeat(emptyLength)}|`
      );
    } catch (err) {
      if (err instanceof CobraActivationLimitReachedError) {
        console.error(
          `AccessKey '${accessKey}' has reached it's processing limit.`
        );
      } else {
        console.error(err);
      }
      isInterrupted = true;
    }
  }

  recorder.stop();
  recorder.release();
  engineInstance.release();
  process.stdout.write("\n");
  process.exit();
}

micDemo();
