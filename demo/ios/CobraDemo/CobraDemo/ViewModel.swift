//
//  Copyright 2021-2023 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import ios_voice_processor
import Cobra
import Combine

class ViewModel: ObservableObject {

    private let ACCESS_KEY = "{YOUR_ACCESS_KEY_HERE}"

    private let ALPHA: Float = 0.5

    private var cobra: Cobra!
    private var isListening = false

    private var timer: Timer?

    @Published var errorMessage = ""
    @Published var recordToggleButtonText: String = "Start"
    @Published var voiceProbability: Float = 0.0
    @Published var THRESHOLD: Float = 0.8
    @Published var detectedText = ""

    init() {
        do {
            try cobra = Cobra(accessKey: ACCESS_KEY)

            VoiceProcessor.instance.addErrorListener(VoiceProcessorErrorListener(errorCallback))
            VoiceProcessor.instance.addFrameListener(VoiceProcessorFrameListener(audioCallback))

        } catch let error as CobraInvalidArgumentError {
            errorMessage = error.localizedDescription
        } catch is CobraActivationError {
            errorMessage = "ACCESS_KEY activation error."
        } catch is CobraActivationRefusedError {
            errorMessage = "ACCESS_KEY activation refused."
        } catch is CobraActivationLimitError {
            errorMessage = "ACCESS_KEY reached its limit."
        } catch is CobraActivationThrottledError {
            errorMessage = "ACCESS_KEY is throttled."
        } catch {
            errorMessage = "\(error)"
        }
    }

    deinit {
        stop()
        cobra.delete()
    }

    public func toggleRecording() {
        if isListening {
            stop()
            recordToggleButtonText = "Start"
        } else {
            start()
            recordToggleButtonText = "Stop"
        }
    }

    public func start() {

        guard !isListening else {
            return
        }

        guard VoiceProcessor.hasRecordAudioPermission else {
            VoiceProcessor.requestRecordAudioPermission { isGranted in
                guard isGranted else {
                    DispatchQueue.main.async {
                        self.errorMessage = "Demo requires microphone permission"
                    }
                    return
                }

                DispatchQueue.main.async {
                    self.start()
                }
            }
            return
        }

        do {
            try VoiceProcessor.instance.start(
                frameLength: Cobra.frameLength,
                sampleRate: Cobra.sampleRate)
            isListening = true
        } catch {
            self.errorMessage = "\(error)"
        }

    }

    public func stop() {
        guard isListening else {
            return
        }

        do {
            try VoiceProcessor.instance.stop()
            isListening = false

            DispatchQueue.main.async {
                self.voiceProbability = 0
                self.timer?.invalidate()
                self.detectedText = ""
            }
        } catch {
            self.errorMessage = "\(error)"
        }
    }

    private func setProbability(value: Float32) {
        self.voiceProbability = (self.ALPHA * value) + ((1 - self.ALPHA) * self.voiceProbability)
        if self.voiceProbability >= self.THRESHOLD {
            timer?.invalidate()
            timer = Timer.scheduledTimer(withTimeInterval: 0.75, repeats: false) {_ in
                self.detectedText = ""
            }
            self.detectedText = "Voice Detected!"
        }
    }

    private func audioCallback(frame: [Int16]) {
        do {
            let result: Float32 = try self.cobra!.process(pcm: frame)
            DispatchQueue.main.async {
                self.setProbability(value: result)
            }
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = "Failed to process pcm frames."
                self.stop()
            }
        }
    }

    private func errorCallback(error: VoiceProcessorError) {
        DispatchQueue.main.async {
            self.errorMessage = "\(error.localizedDescription)"
        }
    }
}
