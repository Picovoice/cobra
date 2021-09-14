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
    case invalidArgument(message:String)
    case io
    case outOfMemory
    case activationServerError
    case invalidAppID
    case connectionFailed
    case requestFailed
    case unexpectedResponse
    case licenseExpired
    case licenseUsageLimitReached
    case licenseDeviceLimitReached
    case appIDThrottled
    case malformedRequest
    case invalidDeviceID
    case appIDNotFound
    case appIDPermissionError
    case appIDDisabled
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
    ///   - appID: AppID obtained from the Picvoice Console (https://picovoice.ai/console/)
    /// - Throws: CobraError
    public init(appID:String) throws {
        let status = pv_cobra_init(appID, &handle)
        try checkStatus(status)
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
    public func process(pcm:UnsafePointer<Int16>) throws -> Float32 {
        var result: Float32 = 0
        let status = pv_cobra_process(self.handle, pcm, &result)
        try checkStatus(status)
        
        return result
    }
    
    /// Processes a frame of the incoming audio stream and emits the detection result.
    ///
    /// - Parameters:
    ///   - pcm: A frame of audio samples. The number of samples per frame can be attained by calling
    /// `.frameLength`. The incoming audio needs to have a sample rate equal to `.sampleRate` and be 16-bit
    /// linearly-encoded. Cobra operates on single-channel audio.
    /// - Returns: Probability of voice activity. It is a floating-point number within [0, 1].
    /// - Throws: CobraError
    public func process(pcm:[Int16]) throws -> Float32 {
        if pcm.count != Cobra.frameLength {
            throw CobraError.invalidArgument(message: "Frame of audio data must contain \(Cobra.frameLength) samples - given frame contained \(pcm.count)")
        }
        
        var result: Float32 = 0
        let status = pv_cobra_process(self.handle, pcm, &result)
        try checkStatus(status)
        
        return result
    }
    
    private func checkStatus(_ status: pv_status_t) throws {
        switch status {
        case PV_STATUS_IO_ERROR:
            throw CobraError.io
        case PV_STATUS_OUT_OF_MEMORY:
            throw CobraError.outOfMemory
        case PV_STATUS_INVALID_ARGUMENT:
            throw CobraError.invalidArgument(message:"Cobra rejected one of the provided arguments.")
        case PV_STATUS_ACTIVATION_SERVER_ERROR:
            throw CobraError.activationServerError
        case PV_STATUS_INVALID_APP_ID:
            throw CobraError.invalidAppID
        case PV_STATUS_CONNECTION_FAILED:
            throw CobraError.connectionFailed
        case PV_STATUS_REQUEST_FAILED:
            throw CobraError.requestFailed
        case PV_STATUS_UNEXPECTED_RESPONSE:
            throw CobraError.unexpectedResponse
        case PV_STATUS_LICENSE_EXPIRED:
            throw CobraError.licenseExpired
        case PV_STATUS_LICENSE_USAGE_LIMIT_REACHED:
            throw CobraError.licenseUsageLimitReached
        case PV_STATUS_LICENSE_DEVICE_LIMIT_REACHED:
            throw CobraError.licenseDeviceLimitReached
        case PV_STATUS_APP_ID_THROTTLED:
            throw CobraError.appIDThrottled
        case PV_STATUS_MALFORMED_REQUEST:
            throw CobraError.malformedRequest
        case PV_STATUS_INVALID_DEVICE_ID:
            throw CobraError.invalidDeviceID
        case PV_STATUS_APP_ID_NOT_FOUND:
            throw CobraError.appIDNotFound
        case PV_STATUS_APP_ID_PERMISSION_ERROR:
            throw CobraError.appIDPermissionError
        case PV_STATUS_APP_ID_DISABLED:
            throw CobraError.appIDDisabled
        default:
            return
        }
    }
}
