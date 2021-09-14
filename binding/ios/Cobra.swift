//
//  Copyright 2021 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import PvCobra

public enum CobraError: Error {
    case CobraOutOfMemoryError(_ message:String)
    case CobraIOError(_ message:String)
    case CobraInvalidArgumentError(_ message:String)
    case CobraStopIterationError(_ message:String)
    case CobraKeyError(_ message:String)
    case CobraInvalidStateError(_ message:String)
    case CobraRuntimeError(_ message:String)
    case CobraActivationError(_ message:String)
    case CobraActivationLimitError(_ message:String)
    case CobraActivationThrottledError(_ message:String)
    case CobraActivationRefusedError(_ message:String)
    case CobraInternalError(_ message:String)
}

/// iOS (Swift) binding for Cobra voice activity detection (VAD) engine. It detects speech signals within an incoming
/// stream of audio in real-time. It processes incoming audio in consecutive frames and for each frame emits the
/// probability of voice activity. The number of samples per frame can be attained by calling '.frameLength'.
/// The incoming audio needs to have a sample rate equal to '.sampleRate' and be 16-bit linearly-encoded. Cobra
/// operates on single-channel audio.
public class Cobra {
    
    private var handle: OpaquePointer?
    
    /// Required number of samples per frame of audio
    public static let frameLength = UInt32(pv_cobra_frame_length())
    
    /// Required audio sample rate
    public static let sampleRate = UInt32(pv_sample_rate())
    
    /// Cobra version string
    public static let version = String(cString: pv_cobra_version())
    
    /// Constructor.
    ///
    /// - Parameters:
    ///   - accessKey: AccessKey obtained from the Picvoice Console (https://picovoice.ai/console/)
    /// - Throws: CobraError
    public init(accessKey: String) throws {
        let status = pv_cobra_init(accessKey, &handle)
        if(status != PV_STATUS_SUCCESS) {
            throw pvStatusToCobraError(status, "Cobra init failed")
        }
    }
    
    deinit {
        self.delete()
    }
    
    /// Releases native resources that were allocated to Cobra
    public func delete(){
        if handle != nil {
            pv_cobra_delete(handle)
            handle = nil
        }
    }
    
    /// Processes a frame of the incoming audio stream and emits the detection result.
    ///
    /// - Parameters:
    ///   - pcm: A frame of audio samples. The number of samples per frame can be attained by calling
    /// `.frameLength`. The incoming audio needs to have a sample rate equal to `.sampleRate` and be 16-bit
    /// linearly-encoded. Cobra operates on single-channel audio.
    /// - Returns: Probability of voice activity. It is a floating-point number within [0, 1].
    /// - Throws: CobraError
    public func process(pcm: [Int16]) throws -> Float32 {
        if pcm.count != Cobra.frameLength {
            throw CobraError.CobraInvalidArgumentError(
                "Frame of audio data must contain \(Cobra.frameLength) samples - given frame contained \(pcm.count)")
        }
        
        var result: Float32 = 0
        let status = pv_cobra_process(self.handle, pcm, &result)
        if(status != PV_STATUS_SUCCESS) {
            throw pvStatusToCobraError(status, "Cobra process failed")
        }
        
        return result
    }
    
    private func pvStatusToCobraError(_ status: pv_status_t, _ message: String) -> CobraError {
        switch status {
            case PV_STATUS_OUT_OF_MEMORY:
                return CobraError.CobraOutOfMemoryError(message)
            case PV_STATUS_IO_ERROR:
                return CobraError.CobraIOError(message)
            case PV_STATUS_INVALID_ARGUMENT:
                return CobraError.CobraInvalidArgumentError(message)
            case PV_STATUS_STOP_ITERATION:
                return CobraError.CobraStopIterationError(message)
            case PV_STATUS_KEY_ERROR:
                return CobraError.CobraKeyError(message)
            case PV_STATUS_INVALID_STATE:
                return CobraError.CobraInvalidStateError(message)
            case PV_STATUS_RUNTIME_ERROR:
                return CobraError.CobraRuntimeError(message)
            case PV_STATUS_ACTIVATION_ERROR:
                return CobraError.CobraActivationError(message)
            case PV_STATUS_ACTIVATION_LIMIT_REACHED:
                return CobraError.CobraActivationLimitError(message)
            case PV_STATUS_ACTIVATION_THROTTLED:
                return CobraError.CobraActivationThrottledError(message)
            case PV_STATUS_ACTIVATION_REFUSED:
                return CobraError.CobraActivationRefusedError(message)
            default:
                let pvStatusString = String(cString: pv_status_to_string(status))
                return CobraError.CobraInternalError("\(pvStatusString): \(message)")
        }
    }
}
