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

class ViewModel: ObservableObject {
    
    private let ACCESS_KEY = "{YOUR_ACCESS_KEY_HERE}
    
    private let voiceDetectionThreshold:Float32 = 0.5
    
    private var cobra: Cobra!
    private var isListening = false
    
    @Published var errorMessage = ""
    @Published var voiceActivityState = false
    @Published var recordToggleButtonText:String = "Start"
    
    init() {
        do {
            try cobra = Cobra(accessKey: ACCESS_KEY)
        } catch CobraError.invalidArgument {
            errorMessage = "ACCESS_KEY provided is invalid."
        } catch CobraError.activationError {
            errorMessage = "ACCESS_KEY activation error."
        } catch CobraError.activationRefused {
            errorMessage = "ACCESS_KEY activation refused."
        } catch CobraError.activationLimitReached {
            errorMessage = "ACCESS_KEY reached its limit."
        } catch CobraError.activationThrottled {
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
    }
    
    private func audioCallback(pcm: [Int16]) -> Void {
        do {
            let result:Float32 = try self.cobra!.process(pcm: pcm)
            let currentVoiceActivityState = result >= self.voiceDetectionThreshold
            if self.voiceActivityState != currentVoiceActivityState {
                DispatchQueue.main.async {
                    self.voiceActivityState = currentVoiceActivityState
                }
            }
        } catch {
            self.errorMessage = "Failed to process pcm frames."
            self.stop()
        }
    }
}
