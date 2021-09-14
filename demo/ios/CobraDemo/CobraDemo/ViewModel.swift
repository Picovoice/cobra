//
//  Copyright 2021 Picovoice Inc.
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
    @Published var recordToggleButtonText:String = "Start"
    @Published var voiceProbability: Float = 0.0
    @Published var THRESHOLD: Float = 0.8
    @Published var detectedText = ""
    
    init() {
        do {
            try cobra = Cobra(accessKey: ACCESS_KEY)
        } catch CobraError.CobraInvalidArgumentError {
            errorMessage = "ACCESS_KEY '\(ACCESS_KEY)' is invalid."
        } catch CobraError.CobraActivationError {
            errorMessage = "ACCESS_KEY activation error."
        } catch CobraError.CobraActivationRefusedError {
            errorMessage = "ACCESS_KEY activation refused."
        } catch CobraError.CobraActivationLimitError {
            errorMessage = "ACCESS_KEY reached its limit."
        } catch CobraError.CobraActivationThrottledError  {
            errorMessage = "ACCESS_KEY is throttled."
        } catch {
            errorMessage = "\(error)"
        }
    }
    
    deinit {
        stop()
        cobra.delete()
    }
    
    public func toggleRecording(){
        
        do {
            if isListening {
                stop();
                recordToggleButtonText = "Start"
            } else {
                try start();
                recordToggleButtonText = "Stop"
            }
        } catch {
            self.errorMessage = "Failed to start audio session."
        }
    }
    
    public func start() throws {
        
        guard !isListening else {
            return
        }
        
        guard try VoiceProcessor.shared.hasPermissions() else {
            print("Permissions denied.")
            return
        }

        try VoiceProcessor.shared.start(
            frameLength: Cobra.frameLength,
            sampleRate: Cobra.sampleRate,
            audioCallback: self.audioCallback)
        isListening = true
    }
    
    public func stop() {
        guard isListening else {
            return
        }
        
        VoiceProcessor.shared.stop()
        isListening = false
        
        DispatchQueue.main.async {
            self.voiceProbability = 0
            self.timer?.invalidate()
            self.detectedText = ""
        }
    }
    
    private func setProbability(value: Float32) {
        self.voiceProbability = (self.ALPHA * value) + ((1 - self.ALPHA) * self.voiceProbability)
        if self.voiceProbability >= self.THRESHOLD {
            timer?.invalidate()
            timer = Timer.scheduledTimer(withTimeInterval: 0.75, repeats: false) {timer in
                self.detectedText = ""
            }
            self.detectedText = "Voice Detected!"
        }
    }
    
    private func audioCallback(pcm: [Int16]) -> Void {
        do {
            let result:Float32 = try self.cobra!.process(pcm: pcm)
            DispatchQueue.main.async {
                self.setProbability(value: result)
            }
        } catch {
            self.errorMessage = "Failed to process pcm frames."
            self.stop()
        }
    }
}
