//
//  CobraDemoUITests.swift
//  CobraDemoUITests
//
//  Created by Eric Mikulin on 2021-09-17.
//

import XCTest
import CobraDemo

class CobraDemoUITests: XCTestCase {
    
    private let APP_ID = ""
    
    override func setUpWithError() throws {
        continueAfterFailure = true
    }

    override func tearDownWithError() throws {
    }

    func testProcess() throws {
        let cobra:Cobra = try Cobra(appID: APP_ID)
        
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
