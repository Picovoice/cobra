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
const fs = require("fs");

const WaveFile = require("wavefile").WaveFile;

const {
  Cobra,
  getInt16Frames,
  checkWaveFile,
} = require("@picovoice/cobra-node");

program
  .requiredOption(
    "-a, --access_key <string>",
    "AccessKey obtain from the Picovoice Console (https://console.picovoice.ai/)"
  )
  .requiredOption("-i, --input_audio_file_path <string>", "input wav file")
  .option(
    "-d, --device <string>",
    "Device to run inference on (`best`, `cpu:{num_threads}` or `gpu:{gpu_index}`). Default: selects best device"
  )
  .option(
    "-l, --library_file_path <string>",
    "absolute path to cobra dynamic library"
  )
  .option(
    "-t --threshold <string>",
    "Threshold for the probability of voice activity"
  )
  .option(
    "-z, --show_inference_devices",
    "Print devices that are available to run Porcupine inference.",
    false);

if (process.argv.length < 2) {
  program.help();
}
program.parse(process.argv);

function fileDemo() {
  let audioPath = program["input_audio_file_path"];
  let accessKey = program["access_key"];
  let device = program["device"];
  let libraryFilePath = program["library_file_path"];
  let threshold = program["threshold"] ?? 0.8;

  const showInferenceDevices = program["show_inference_devices"];
  if (showInferenceDevices) {
    console.log(Porcupine.listAvailableDevices().join('\n'));
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

  if (!fs.existsSync(audioPath)) {
    console.error(`--input_audio_file_path file not found: ${audioPath}`);
    return;
  }

  let waveBuffer = fs.readFileSync(audioPath);
  let inputWaveFile;
  try {
    inputWaveFile = new WaveFile(waveBuffer);
  } catch (error) {
    console.error(`Exception trying to read file as wave format: ${audioPath}`);
    console.error(error);
    return;
  }

  if (!checkWaveFile(inputWaveFile, engineInstance.sampleRate)) {
    console.error(
      "Audio file did not meet requirements. Wave file must be 16KHz, 16-bit, linear PCM (mono)."
    );
  }

  let frames = getInt16Frames(inputWaveFile, engineInstance.frameLength);

  const printedNumbers = new Set();
  for (let i = 0; i < frames.length; i++) {
    const result = engineInstance.process(frames[i]);
    const timestamp = (
      (i * engineInstance.frameLength) /
      engineInstance.sampleRate
    ).toFixed(1);

    if (result >= threshold && !printedNumbers.has(timestamp)) {
      console.log(`Detected voice activity at ${timestamp} sec`);
      printedNumbers.add(timestamp);
    }
  }

  engineInstance.release();
}

fileDemo();
