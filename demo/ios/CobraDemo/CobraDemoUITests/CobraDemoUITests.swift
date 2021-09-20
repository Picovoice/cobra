//
//  Copyright 2021 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import XCTest
import CobraDemo

class CobraDemoUITests: XCTestCase {
    
    private let appID = "{TESTING_APP_ID_HERE}";
    
    override func setUpWithError() throws {
        continueAfterFailure = true
    }

    override func tearDownWithError() throws {
    }

    func testProcess() throws {
        let cobra:Cobra = try Cobra(appID: appID)
        
        let bundle = Bundle(for: type(of: self))
        let fileURL:URL = bundle.url(forResource: "sample", withExtension: "wav")!
    
        let data = try Data(contentsOf: fileURL)
        let frameLengthBytes = Int(Cobra.frameLength) * 2
        var pcmBuffer = Array<Int16>(repeating: 0, count: Int(Cobra.frameLength))
        
        var results:[Float32] = []
        let threshold:Float32 = 0.8
        var index = 44
        while(index + frameLengthBytes < data.count) {
            _ = pcmBuffer.withUnsafeMutableBytes { data.copyBytes(to: $0, from: index..<(index + frameLengthBytes)) }
            let voiceProbability:Float32 = try cobra.process(pcm:pcmBuffer)
            if(voiceProbability >= threshold){
                results.append(voiceProbability)
            }
            
            index += frameLengthBytes
        }
        
        cobra.delete()
        
        let voiceProbabilityRef:[Float32] = [
            0.880, 0.881, 0.992, 0.999, 0.999,
            0.999, 0.999, 0.999, 0.999, 0.999,
            0.999, 0.999, 0.999, 0.999, 0.999,
            0.999, 0.997, 0.978, 0.901
        ]
        XCTAssert(voiceProbabilityRef.count == results.count)
        for i in 0..<voiceProbabilityRef.count {
            let error = voiceProbabilityRef[i] - results[i]
            XCTAssert(error < 0.001)
        }
    }
}
