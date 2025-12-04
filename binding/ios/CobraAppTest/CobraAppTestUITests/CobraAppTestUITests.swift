//
//  Copyright 2022-2025 Picovoice Inc.
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
    let device: String = "{TESTING_DEVICE_HERE}"

    override func setUpWithError() throws {
        continueAfterFailure = true
    }

    func testProcess() throws {
        let cobra: Cobra = try Cobra(accessKey: accessKey, device: device)

        let bundle = Bundle(for: type(of: self))
        let fileURL: URL = bundle.url(forResource: "sample", withExtension: "wav")!

        let data = try Data(contentsOf: fileURL)
        let frameLengthBytes = Int(Cobra.frameLength) * 2
        var pcmBuffer = [Int16](repeating: 0, count: Int(Cobra.frameLength))

        var results: [Float32] = []
        var index = 44
        while index + frameLengthBytes < data.count {
            _ = pcmBuffer.withUnsafeMutableBytes { data.copyBytes(to: $0, from: index..<(index + frameLengthBytes)) }
            let voiceProbability: Float32 = try cobra.process(pcm: pcmBuffer)
            results.append(voiceProbability)

            index += frameLengthBytes
        }

        cobra.delete()

        let numSamples = (data.count - 44) / 2
        let frameLength = Int(Cobra.frameLength)
        let numFrames = numSamples / frameLength
        var labels = [Float32](repeating: 0.0, count: numFrames)

        (28..<53).forEach { labels[$0] = 1.0 }
        (97..<121).forEach { labels[$0] = 1.0 }
        (163..<183).forEach { labels[$0] = 1.0 }
        (227..<252).forEach { labels[$0] = 1.0 }

        XCTAssert(labels.count == results.count)

        var error: Float32 = 0

        for i in 0..<labels.count {
            error -= (labels[i] * logf(results[i])) + ((1 - labels[i]) * logf(1 - results[i]))
        }

        error /= Float32(results.count)
        XCTAssert(error < 0.1)

    }

    func testMessageStack() throws {
        var first_error: String = ""
        do {
            let cobra: Cobra = try Cobra(accessKey: "invalid", device: device)
            XCTAssertNil(cobra)
        } catch {
            first_error = "\(error.localizedDescription)"
            XCTAssert(first_error.count < 1024)
        }

        do {
            let cobra: Cobra = try Cobra(accessKey: "invalid", device: device)
            XCTAssertNil(cobra)
        } catch {
            XCTAssert("\(error.localizedDescription)".count == first_error.count)
        }
    }

    func testProcessMessageStack() throws {
        let cobra: Cobra = try Cobra(accessKey: accessKey, device: device)
        cobra.delete()

        var testPcm: [Int16] = []
        testPcm.reserveCapacity(Int(Cobra.frameLength))

        do {
            let res = try cobra.process(pcm: testPcm)
            XCTAssert(res == 66.6)
        } catch {
            XCTAssert("\(error.localizedDescription)".count > 0)
        }
    }
    
    func testGetAvailableDevices() throws {
        let cobra: Cobra = try Cobra(accessKey: accessKey, device: device)
        let devices = try cobra.getAvailableDevices()
        XCTAssert(!devices.isEmpty)
        for device in devices {
            XCTAssert(!device.isEmpty)
        }
    }
}
