//
//  Copyright 2021 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import AVFoundation
import Foundation

class ViewModel: ObservableObject {
    
    private let APP_ID = "{YOUR_APP_ID_HERE}"
    
    private let voiceDetectionThreshold:Float32 = 0.5
    
    private var cobra:Cobra!
    private let audioInputEngine: AudioInputEngine
    private var isListening = false
    
    @Published var voiceActivityState = false
    @Published var recordToggleButtonText:String = "Start"
    
    init() {
        do {
            try cobra = Cobra(appID: APP_ID)
        } catch {
            print("\(error)")
        }
        
        self.audioInputEngine = AudioInputEngine()
        audioInputEngine.audioInput = { [weak self] audio in
            
            guard let `self` = self else {
                return
            }
            
            guard self.cobra != nil else {
                return
            }
            
            do {
                let result:Float32 = try self.cobra!.process(pcm: audio)
                let currentVoiceActivityState = result >= self.voiceDetectionThreshold
                if self.voiceActivityState != currentVoiceActivityState {
                    DispatchQueue.main.async {
                        self.voiceActivityState = currentVoiceActivityState
                    }
                }
            } catch {
                print("\(error)")
            }
        }
    }
    
    deinit {
        stop();
        cobra.delete();
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
            print("\(error)")
        }
    }
    
    public func start() throws {
        
        guard !isListening else {
            return
        }
        
        let audioSession = AVAudioSession.sharedInstance()
        if audioSession.recordPermission == .denied {
            print("Recording permission is required for this demo");
            return;
        }
        
        try audioSession.setCategory(AVAudioSession.Category.playAndRecord, options: [.mixWithOthers, .defaultToSpeaker, .allowBluetooth])
        
        try audioInputEngine.start()
        
        isListening = true
    }
    
    public func stop() {
        guard isListening else {
            return
        }
        
        audioInputEngine.stop()
        
        isListening = false
    }
    
    private class AudioInputEngine {
        private let numBuffers = 3
        private var audioQueue: AudioQueueRef?
        
        var audioInput: ((UnsafePointer<Int16>) -> Void)?
        
        func start() throws {
            var format = AudioStreamBasicDescription(
                mSampleRate: Float64(Cobra.sampleRate),
                mFormatID: kAudioFormatLinearPCM,
                mFormatFlags: kLinearPCMFormatFlagIsSignedInteger | kLinearPCMFormatFlagIsPacked,
                mBytesPerPacket: 2,
                mFramesPerPacket: 1,
                mBytesPerFrame: 2,
                mChannelsPerFrame: 1,
                mBitsPerChannel: 16,
                mReserved: 0)
            let userData = UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque())
            AudioQueueNewInput(&format, createAudioQueueCallback(), userData, nil, nil, 0, &audioQueue)
            
            guard let queue = audioQueue else {
                return
            }
            
            let bufferSize = UInt32(Cobra.frameLength) * 2
            for _ in 0..<numBuffers {
                var bufferRef: AudioQueueBufferRef? = nil
                AudioQueueAllocateBuffer(queue, bufferSize, &bufferRef)
                if let buffer = bufferRef {
                    AudioQueueEnqueueBuffer(queue, buffer, 0, nil)
                }
            }
            
            AudioQueueStart(queue, nil)
        }
        
        func stop() {
            guard let audioQueue = audioQueue else {
                return
            }
            AudioQueueFlush(audioQueue)
            AudioQueueStop(audioQueue, true)
            AudioQueueDispose(audioQueue, true)
            audioInput = nil
        }
        
        private func createAudioQueueCallback() -> AudioQueueInputCallback {
            return { userData, queue, bufferRef, startTimeRef, numPackets, packetDescriptions in
                
                // `self` is passed in as userData in the audio queue callback.
                guard let userData = userData else {
                    return
                }
                let `self` = Unmanaged<AudioInputEngine>.fromOpaque(userData).takeUnretainedValue()
                
                let pcm = bufferRef.pointee.mAudioData.assumingMemoryBound(to: Int16.self)
                
                if let audioInput = self.audioInput {
                    audioInput(pcm)
                }
                
                AudioQueueEnqueueBuffer(queue, bufferRef, 0, nil)
            }
        }
    }
}
