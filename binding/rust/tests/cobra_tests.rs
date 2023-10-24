/*
    Copyright 2021-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#[cfg(test)]
mod tests {
    use itertools::Itertools;
    use rodio::{source::Source, Decoder};
    use std::env;
    use std::fs::File;
    use std::io::BufReader;
    use std::iter::zip;

    use cobra::Cobra;

    #[test]
    fn test_process() {
        let access_key = env::var("PV_ACCESS_KEY")
            .expect("Pass the AccessKey in using the PV_ACCESS_KEY env variable");
        let cobra = Cobra::new(access_key).expect("Unable to create Cobra");

        let soundfile_path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../res/audio/sample.wav");
        let soundfile = BufReader::new(File::open(soundfile_path).expect(soundfile_path));
        let source = Decoder::new(soundfile).unwrap();

        assert_eq!(cobra.sample_rate(), source.sample_rate());

        let mut num_frames = 0;
        let mut probabilities: Vec<f32> = Vec::new();
        for frame in &source.chunks(cobra.frame_length() as usize) {
            let frame = frame.collect_vec();
            if frame.len() == cobra.frame_length() as usize {
                let voice_probability = cobra.process(&frame).unwrap();
                probabilities.push(voice_probability);
            }
            num_frames += 1;
        }

        let mut labels = vec![0.0; num_frames];
        for i in 10..28 {
            labels[i] = 1.0;
        }

        let loss_fn = |(l, p): (f32, f32)| {
            l * p.ln() + (1.0 - l) * (1.0 - p).ln()
        };
        let loss: f32 = zip(labels, probabilities)
            .map(loss_fn)
            .filter(|x| x.is_finite())
            .sum::<f32>()
            / num_frames as f32;
        assert!(loss.abs() < 0.1);
    }

    #[test]
    fn test_error_stack() {
        let mut error_stack = Vec::new();

        let res = Cobra::new("invalid");
        if let Err(err) = res {
            error_stack = err.message_stack
        }

        assert!(0 < error_stack.len() && error_stack.len() <= 8);
        
        let res = Cobra::new("invalid");
        if let Err(err) = res {
            assert_eq!(error_stack.len(), err.message_stack.len());
            for i in 0..error_stack.len() {
                assert_eq!(error_stack[i], err.message_stack[i])
            }
        }
    }

    #[test]
    fn test_version() {
        let access_key = env::var("PV_ACCESS_KEY")
            .expect("Pass the AccessKey in using the PV_ACCESS_KEY env variable");
        let cobra = Cobra::new(access_key).expect("Unable to create Cobra");

        assert!(!cobra.version().is_empty());
    }
}
