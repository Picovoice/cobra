//
//  Copyright 2022 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import XCTest
import Cobra

class CobraAppTestUITests: XCTestCase {
    
    private let accessKey = "{TESTING_ACCESS_KEY_HERE}"
    let thresholdString: String = "{PERFORMANCE_THRESHOLD_SEC}"

    override func setUpWithError() throws {
        continueAfterFailure = true
    }

    override func tearDownWithError() throws {
    }

    func testProcess() throws {
        let cobra:Cobra = try Cobra(accessKey: accessKey)
        
        let bundle = Bundle(for: type(of: self))
        let fileURL:URL = bundle.url(forResource: "sample", withExtension: "wav")!
    
        let data = try Data(contentsOf: fileURL)
        let frameLengthBytes = Int(Cobra.frameLength) * 2
        var pcmBuffer = Array<Int16>(repeating: 0, count: Int(Cobra.frameLength))
        
        var results:[Float32] = []
        var index = 44
        while(index + frameLengthBytes < data.count) {
            _ = pcmBuffer.withUnsafeMutableBytes { data.copyBytes(to: $0, from: index..<(index + frameLengthBytes)) }
            let voiceProbability:Float32 = try cobra.process(pcm:pcmBuffer)
            results.append(voiceProbability)
            
            index += frameLengthBytes
        }
        
        cobra.delete()
        
        let labels:[Float32] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                                             0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        XCTAssert(labels.count == results.count)
        
        var error: Float32 = 0
        
        for i in 0..<labels.count {
            error -= (labels[i] * logf(results[i])) + ((1 - labels[i]) * logf(1 - results[i]))
        }
        
        error /= Float32(results.count)
        XCTAssert(error < 0.1)
        
    }

    func testPerformance() throws {

        try XCTSkipIf(thresholdString == "{PERFORMANCE_THRESHOLD_SEC}")

        let performanceThresholdSec = Double(thresholdString)
        try XCTSkipIf(performanceThresholdSec == nil)

        let cobra:Cobra = try Cobra(accessKey: accessKey)
        
        let bundle = Bundle(for: type(of: self))
        let fileURL:URL = bundle.url(forResource: "sample", withExtension: "wav")!
    
        let data = try Data(contentsOf: fileURL)
        let frameLengthBytes = Int(Cobra.frameLength) * 2
        var pcmBuffer = Array<Int16>(repeating: 0, count: Int(Cobra.frameLength))
        
        var totalNSec = 0.0
        var results:[Float32] = []
        var index = 44
        while(index + frameLengthBytes < data.count) {
            _ = pcmBuffer.withUnsafeMutableBytes { data.copyBytes(to: $0, from: index..<(index + frameLengthBytes)) }
            let before = CFAbsoluteTimeGetCurrent()
            let voiceProbability:Float32 = try cobra.process(pcm:pcmBuffer)
            let after = CFAbsoluteTimeGetCurrent()
            totalNSec += (after - before)
            results.append(voiceProbability)
            
            index += frameLengthBytes
        }
        
        cobra.delete()

        let totalSec = Double(round(totalNSec * 1000) / 1000)
        XCTAssertLessThanOrEqual(totalSec, performanceThresholdSec!)
        
    }
}
