//
//  Copyright 2021 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//
import ios_voice_processor

public enum CobraManagerError: Error {
    case recordingDenied
    case objectDisposed
}

/// High-level iOS binding for Cobra voice detection. It handles recording audio from microphone, processes it in real-time using Cobra, and notifies the
/// client when any voice is detected.
public class CobraManager {
    private var onDetection: ((Float32) -> Void)?
    private var errorCallback: ((Error) -> Void)?
    
    private var cobra: Cobra?
    
    private var isListening = false
    
    /// Private constructor.
    private init(cobra: Cobra, onDetection: ((Float32) -> Void)?, errorCallback: ((Error) -> Void)?) throws {
        self.onDetection = onDetection
        self.errorCallback = errorCallback
        self.cobra = cobra
    }
    
    /// Constructor.
    ///
    /// - Parameters:
    ///   - accessKey: AccessKey obtained from the Picvoice Console (https://picovoice.ai/console/)
    ///   - onDetection: Invoked when voice activity is detected.
    ///   - errorCallback: Invoked if an error occurs while processing frames. If missing, error will be printed to console.
    /// - Throws: PorcupineError
    public convenience init(
        accessKey: String,
        onDetection: ((Float32) -> Void)?,
        errorCallback: ((Error) -> Void)? = nil) throws {
        
        try self.init(
            cobra: Cobra(accessKey: accessKey),
            onDetection:onDetection,
            errorCallback: errorCallback)
    }
    
    deinit {
        self.delete()
    }
    
    /// Stops recording and releases Porcupine resources
    public func delete() {
        if isListening {
            stop()
        }
        
        if self.cobra != nil {
            self.cobra!.delete()
            self.cobra = nil
        }
    }
    
    ///  Starts recording audio from the microphone and monitors it for the utterances of the given set of keywords.
    ///
    /// - Throws: AVAudioSession, AVAudioEngine errors. Additionally PorcupineManagerError if
    ///           microphone permission is not granted or Porcupine has been disposed.
    public func start() throws {
        
        guard !isListening else {
            return
        }

        if cobra == nil {
            throw CobraManagerError.objectDisposed
        }

        // Only check if it's denied, permission will be automatically asked.
        guard try VoiceProcessor.shared.hasPermissions() else {
            throw CobraManagerError.recordingDenied
        }
        
        try VoiceProcessor.shared.start(
            frameLength: Cobra.frameLength,
            sampleRate: Cobra.sampleRate,
            audioCallback: self.audioCallback
        )
        
        isListening = true
    }
    
    /// Stop listening for wake words.
    public func stop() {
        guard isListening else {
            return
        }
        
        VoiceProcessor.shared.stop()
        
        isListening = false
    }
    
    /// Callback to run after after voice processor processes frames.
    private func audioCallback(pcm: [Int16]) {
        guard self.cobra != nil else {
            return
        }
        
        do{
            let result: Float32 = try self.cobra!.process(pcm: pcm)
            DispatchQueue.main.async {
                self.onDetection?(result)
            }
        } catch {
            if self.errorCallback != nil {
                self.errorCallback!(error)
            } else {
                print("\(error)")
            }
        }
    }
}
