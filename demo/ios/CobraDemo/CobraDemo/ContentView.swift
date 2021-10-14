//
//  Copyright 2021 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import SwiftUI

func deg2rad(_ number: Double) -> Double {
    return number * .pi / 180
}

func getX(radius: Double, percentage: Double) -> CGFloat {
    return CGFloat(radius * cos(deg2rad(180 * (1 - percentage))))
}

func getY(radius: Double, percentage: Double) -> CGFloat {
    return CGFloat(radius * sin(deg2rad(180 * (1 - percentage))))
}

struct Analog: Shape {
    var startAngle: Angle
    var endAngle: Angle
    var clockwise: Bool
    
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.addArc(
            center: CGPoint(x: rect.midX, y: rect.maxY - 10),
            radius: (rect.width - 40) / 2,
            startAngle: startAngle,
            endAngle: endAngle,
            clockwise: clockwise)
        
        return path
    }
}

struct Needle: Shape {
    var value: Float = 0
    
    func path(in rect: CGRect) -> Path {
        let width = (rect.width - 40) / 2
        
        var path = Path()
        path.move(to: CGPoint(x: width - 10, y: 0))
        path.addLine(to: CGPoint(x: 0, y: 5))
        path.addLine(to: CGPoint(x: -5, y: 0))
        path.addLine(to: CGPoint(x: 0, y: -5))
        path.addLine(to: CGPoint(x: width - 10, y: 0))
        
        let angle = CGFloat.pi + (CGFloat.pi * CGFloat(value))
        path = path.applying(CGAffineTransform(rotationAngle: angle))
        path = path.applying(CGAffineTransform(translationX: width + 20, y: rect.maxY - 10))
        
        
        return path
    }
}

struct ContentView: View {
    @StateObject var viewModel = ViewModel()
    let activeBlue = Color(red: 55/255, green: 125/255, blue: 1, opacity: 1)
    let detectionBlue = Color(red: 0, green: 229/255, blue: 195/255, opacity: 1)
    let dangerRed = Color(red: 1, green: 14/255, blue: 14/255, opacity: 1)
    let secondaryGrey = Color(red: 118/255, green: 131/255, blue: 142/255, opacity: 1)
    
    var body: some View {
        let threshold: Float = 0.8
        let isError = viewModel.errorMessage.count > 0
        let btnColor = (isError) ? secondaryGrey : activeBlue
        let errorMsgColor = (isError) ? dangerRed : Color.white
        
        VStack(alignment: .center){
            Spacer()
            
            Text("Probability of Voice")
                .font(.system(size: 26))
                .foregroundColor(.black)
            
            ZStack(alignment: .leading) {
                Analog(startAngle: .degrees(-180), endAngle: .degrees(-180 + (180 * 0.8)), clockwise: false)
                    .stroke(Color.gray, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                Analog(startAngle: .degrees(-180 + (180 * 0.8)), endAngle: .degrees(0), clockwise: false)
                    .stroke(activeBlue, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                Needle(value: viewModel.voiceProbability)
                    .foregroundColor((viewModel.voiceProbability >= threshold) ? activeBlue : secondaryGrey)
                
                GeometryReader { geometry in
                    let centerX = geometry.size.width / 2
                    let centerY = geometry.size.height
                    let radius = (geometry.size.width - 40) / 2
                    
                    Text("0%")
                        .font(.system(size: 12))
                        .foregroundColor(.black)
                        .position(x: 20, y: geometry.size.height)
                    
                    Text("100%")
                        .font(.system(size: 12))
                        .foregroundColor(.black)
                        .position(x: geometry.size.width - 20, y: geometry.size.height)
                    
                    Text("50%")
                        .font(.system(size: 12))
                        .foregroundColor(.black)
                        .position(
                            x: centerX + getX(radius: radius, percentage: 0.5) + 5,
                            y: centerY - getY(radius: radius, percentage: 0.5) - 25)
                    
                    Text("80%")
                        .font(.system(size: 12))
                        .foregroundColor(.black)
                        .position(
                            x: centerX + getX(radius: radius, percentage: Double(threshold)) + 15,
                            y: centerY - getY(radius: radius, percentage: Double(threshold)) - 25)
                }
            }
                .frame(maxHeight: 300)
            
            Spacer()
            
            if (viewModel.voiceProbability >= threshold) {
                Text("Voice Detected!")
                    .font(.system(size: 20))
                    .frame(height: 80)
                    .foregroundColor(secondaryGrey)
            } else {
                Text("")
                    .frame(height: 80)
            }
            
            Spacer()
            
            Button(action: viewModel.toggleRecording){
                Text(viewModel.recordToggleButtonText)
                    .font(.title)
                    .background(btnColor)
                    .foregroundColor(.white)
                    .padding(.horizontal, 35.0)
                    .padding(.vertical, 20.0)
            }.background(
                Capsule().fill(btnColor)
            )
                .padding(12)
                .disabled(isError)
            
            Spacer()
            
            Text(viewModel.errorMessage)
                .frame(minWidth: 0, maxWidth: UIScreen.main.bounds.width - 50)
                .padding(.vertical, 10)
                .padding(.horizontal, 10)
                .font(.body)
                .background(viewModel.voiceActivityState ? detectionBlue : errorMsgColor)
                .foregroundColor(Color.white)
                .cornerRadius(.infinity)
            
            Spacer()
        }.frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity).background(viewModel.voiceActivityState ? detectionBlue : Color.white)
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
