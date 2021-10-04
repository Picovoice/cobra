/*
    Copyright 2021 Picovoice Inc.

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

    use cobra::Cobra;

    #[test]
    fn test_process() {
        let args: Vec<String> = env::args().collect();
        let app_id = args[1].clone();

        let cobra = Cobra::new(app_id).expect("Unable to create Cobra");

        let soundfile_path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../res/audio/sample.wav");
        let soundfile = BufReader::new(File::open(soundfile_path).expect(soundfile_path));
        let source = Decoder::new(soundfile).unwrap();

        assert_eq!(cobra.sample_rate(), source.sample_rate());

        let threshold = 0.8;
        let mut results = Vec::new();
        for frame in &source.chunks(cobra.frame_length() as usize) {
            let frame = frame.collect_vec();
            if frame.len() == cobra.frame_length() as usize {
                let voice_probability = cobra.process(&frame).unwrap();
                if voice_probability >= threshold {
                    results.push(voice_probability);
                }
            }
        }

        let voice_probability_ref = vec![
            0.880, 0.881, 0.992, 0.999, 0.999, 0.999, 0.999, 0.999, 0.999, 0.999, 0.999, 0.999,
            0.999, 0.999, 0.999, 0.999, 0.997, 0.978, 0.901,
        ];
        assert_eq!(results.len(), voice_probability_ref.len());

        for (prob, prob_ref) in results.iter().zip(voice_probability_ref) {
            let error = prob - prob_ref;
            assert!(error.abs() < 0.001);
        }
    }
}
