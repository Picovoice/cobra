/*
    Copyright 2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

use clap::{App, Arg, ArgGroup};
use cobra::Cobra;
use ctrlc;
use hound;
use pv_recorder::{Recorder, RecorderBuilder};
use std::io;
use std::io::Write;

use std::sync::atomic::{AtomicBool, Ordering};

static LISTENING: AtomicBool = AtomicBool::new(false);

fn cobra_demo(audio_device_index: i32, access_key: &str, threshold: f32, output_path: Option<&str>) {
    let cobra = Cobra::new(access_key).expect("Failed to create Cobra");

    let recorder = RecorderBuilder::new()
        .device_index(audio_device_index)
        .frame_length(cobra.frame_length() as i32)
        .init()
        .expect("Failed to initialize pvrecorder");
    recorder.start().expect("Failed to start audio recording");

    LISTENING.store(true, Ordering::SeqCst);
    ctrlc::set_handler(|| {
        LISTENING.store(false, Ordering::SeqCst);
    })
    .expect("Unable to setup signal handler");

    println!("Listening [Threshold {:.2}]...", threshold);

    let mut audio_data = Vec::new();
    while LISTENING.load(Ordering::SeqCst) {
        let mut pcm = vec![0; recorder.frame_length()];
        recorder.read(&mut pcm).expect("Failed to read audio frame");

        let voice_activity = cobra.process(&pcm).unwrap();
        if voice_activity >= threshold {
            print!("Voice activity...\r");
        } else {
            print!("                 \r");
        }
        io::stdout().flush().expect("Unable to write to stdout");

        if !output_path.is_none() {
            audio_data.extend_from_slice(&pcm);
        }
    }

    println!("\nStopping...");
    recorder.stop().expect("Failed to stop audio recording");

    if let Some(output_path) = output_path {
        let wavspec = hound::WavSpec {
            channels: 1,
            sample_rate: cobra.sample_rate(),
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        };
        let mut writer = hound::WavWriter::create(output_path, wavspec)
            .expect("Failed to open output audio file");
        for sample in audio_data {
            writer.write_sample(sample).unwrap();
        }
    }
}

fn show_audio_devices() {
    let audio_devices = Recorder::get_audio_devices();
    match audio_devices {
        Ok(audio_devices) => {
            for (idx, device) in audio_devices.iter().enumerate() {
                println!("index: {}, device name: {:?}", idx, device);
            }
        }
        Err(err) => panic!("Failed to get audio devices: {}", err),
    };
}

fn main() {
    let matches = App::new("Picovoice Cobra Rust Mic Demo")
        .group(
            ArgGroup::with_name("actions_group")
                .arg("access_key")
                .arg("show_audio_devices")
                .required(true),
        )
        .arg(
            Arg::with_name("access_key")
                .long("access_key")
                .value_name("ACCESS_KEY")
                .help("AppID provided by Picovoice Console (https://picovoice.ai/console/)")
                .takes_value(true),
        )
        .arg(
            Arg::with_name("threshold")
                .long("threshold")
                .value_name("THRESHOLD")
                .help("Threshold for the probability of voice activity")
                .takes_value(true)
                .default_value("0.5"),
        )
        .arg(
            Arg::with_name("audio_device_index")
                .long("audio_device_index")
                .value_name("INDEX")
                .help("Index of input audio device.")
                .takes_value(true)
                .default_value("-1"),
        )
        .arg(
            Arg::with_name("output_path")
                .long("output_path")
                .value_name("PATH")
                .help("Path to recorded audio (for debugging).")
                .takes_value(true),
        )
        .arg(Arg::with_name("show_audio_devices").long("show_audio_devices"))
        .get_matches();

    if matches.is_present("show_audio_devices") {
        return show_audio_devices();
    }

    let audio_device_index = matches
        .value_of("audio_device_index")
        .unwrap()
        .parse()
        .unwrap();

    let threshold = matches.value_of("threshold").unwrap().parse().unwrap();

    let access_key = matches
        .value_of("access_key")
        .expect("AppID is REQUIRED for Cobra operation");
    let output_path = matches.value_of("output_path");

    cobra_demo(audio_device_index, access_key, threshold, output_path);
}
