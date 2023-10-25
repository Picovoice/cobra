//
//  Copyright 2021-2023 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import PvCobra

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

    private static var sdk = "ios"

    public static func setSdk(sdk: String) {
        self.sdk = sdk
    }

    /// Constructor.
    ///
    /// - Parameters:
    ///   - accessKey: AccessKey obtained from the Picovoice Console (https://console.picovoice.ai/)
    /// - Throws: CobraError
    public init(accessKey: String) throws {
        pv_set_sdk(Cobra.sdk)

        let status = pv_cobra_init(accessKey, &handle)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try getMessageStack()
            throw pvStatusToCobraError(status, "Cobra init failed", messageStack)
        }
    }

    deinit {
        self.delete()
    }

    /// Releases native resources that were allocated to Cobra
    public func delete() {
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
        if handle == nil {
            throw CobraInvalidStateError("Unable to process - resources have been released")
        }

        if pcm.count != Cobra.frameLength {
            throw CobraInvalidArgumentError(
                "Frame of audio data must contain \(Cobra.frameLength) samples - given frame contained \(pcm.count)")
        }

        var result: Float32 = 0
        let status = pv_cobra_process(self.handle, pcm, &result)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try getMessageStack()
            throw pvStatusToCobraError(status, "Cobra process failed", messageStack)
        }

        return result
    }

    private func pvStatusToCobraError(
        _ status: pv_status_t,
        _ message: String,
        _ messageStack: [String] = []) -> CobraError {
        switch status {
        case PV_STATUS_OUT_OF_MEMORY:
            return CobraMemoryError(message, messageStack)
        case PV_STATUS_IO_ERROR:
            return CobraIOError(message, messageStack)
        case PV_STATUS_INVALID_ARGUMENT:
            return CobraInvalidArgumentError(message, messageStack)
        case PV_STATUS_STOP_ITERATION:
            return CobraStopIterationError(message, messageStack)
        case PV_STATUS_KEY_ERROR:
            return CobraKeyError(message, messageStack)
        case PV_STATUS_INVALID_STATE:
            return CobraInvalidStateError(message, messageStack)
        case PV_STATUS_RUNTIME_ERROR:
            return CobraRuntimeError(message, messageStack)
        case PV_STATUS_ACTIVATION_ERROR:
            return CobraActivationError(message, messageStack)
        case PV_STATUS_ACTIVATION_LIMIT_REACHED:
            return CobraActivationLimitError(message, messageStack)
        case PV_STATUS_ACTIVATION_THROTTLED:
            return CobraActivationThrottledError(message, messageStack)
        case PV_STATUS_ACTIVATION_REFUSED:
            return CobraActivationRefusedError(message, messageStack)
        default:
            let pvStatusString = String(cString: pv_status_to_string(status))
                return CobraError("\(pvStatusString): \(message)", messageStack)
        }
    }

    private func getMessageStack() throws -> [String] {
        var messageStackRef: UnsafeMutablePointer<UnsafeMutablePointer<Int8>?>?
        var messageStackDepth: Int32 = 0
        let status = pv_get_error_stack(&messageStackRef, &messageStackDepth)
        if status != PV_STATUS_SUCCESS {
            throw pvStatusToCobraError(status, "Unable to get Cobra error state")
        }

        var messageStack: [String] = []
        for i in 0..<messageStackDepth {
            messageStack.append(String(cString: messageStackRef!.advanced(by: Int(i)).pointee!))
        }

        pv_free_error_stack(messageStackRef)

        return messageStack
    }
}
