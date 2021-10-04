/*
    Copyright 2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

use chrono::Duration;
use clap::{App, Arg};
use cobra::Cobra;
use hound;
use itertools::Itertools;
use std::path::PathBuf;

fn cobra_demo(input_audio_path: PathBuf, app_id: &str, threshold: f32) {
    let cobra = Cobra::new(app_id).expect("Failed to create Cobra");

    let mut wav_reader = match hound::WavReader::open(input_audio_path.clone()) {
        Ok(reader) => reader,
        Err(err) => panic!(
            "Failed to open .wav audio file {}: {}",
            input_audio_path.display(),
            err
        ),
    };

    if wav_reader.spec().sample_rate != cobra.sample_rate() {
        panic!(
            "Audio file should have the expected sample rate of {}, got {}",
            cobra.sample_rate(),
            wav_reader.spec().sample_rate
        );
    }

    if wav_reader.spec().channels != 1u16 {
        panic!(
            "Audio file should have the expected number of channels 1, got {}",
            wav_reader.spec().channels
        );
    }

    if wav_reader.spec().bits_per_sample != 16u16
        || wav_reader.spec().sample_format != hound::SampleFormat::Int
    {
        panic!("WAV format should be in the signed 16 bit format",);
    }

    let mut timestamp = Duration::zero();
    for frame in &wav_reader.samples().chunks(cobra.frame_length() as usize) {
        let frame: Vec<i16> = frame.map(|s| s.unwrap()).collect_vec();
        timestamp = timestamp
            + Duration::milliseconds(((1000 * frame.len()) / cobra.sample_rate() as usize) as i64);

        if frame.len() == cobra.frame_length() as usize {
            let voice_activity = cobra.process(&frame).unwrap();
            if voice_activity >= threshold {
                println!(
                    "Detected voice activity at {}.{} seconds",
                    timestamp.num_seconds(),
                    timestamp.num_milliseconds() - (timestamp.num_seconds() * 1000),
                );
            }
        }
    }
}

fn main() {
    let matches = App::new("Picovoice Cobra Rust File Demo")
        .arg(
            Arg::with_name("input_audio_path")
                .long("input_audio_path")
                .value_name("PATH")
                .help("Path to input audio file (mono, WAV, 16-bit, 16kHz).")
                .takes_value(true)
                .required(true),
        )
        .arg(
            Arg::with_name("app_id")
                .long("app_id")
                .value_name("APP_ID")
                .help("AppID provided by Picovoice Console (https://picovoice.ai/console/)")
                .takes_value(true)
                .required(true),
        )
        .arg(
            Arg::with_name("threshold")
                .long("threshold")
                .value_name("THRESHOLD")
                .help("Threshold for the probability of voice activity")
                .takes_value(true)
                .default_value("0.5"),
        )
        .get_matches();

    let input_audio_path = PathBuf::from(matches.value_of("input_audio_path").unwrap());

    let threshold = matches.value_of("threshold").unwrap().parse().unwrap();

    let app_id = matches
        .value_of("app_id")
        .expect("AppID is REQUIRED for Cobra operation");

    cobra_demo(input_audio_path, app_id, threshold);
}
