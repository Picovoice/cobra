// swift-tools-version:5.3
import PackageDescription

let package = Package(
    name: "Cobra-iOS",
    platforms: [
        .iOS(.v13)
    ],
    products: [
        .library(
            name: "Cobra",
            targets: ["Cobra"]
        )
    ],
    targets: [
        .target(
            name: "Cobra",
            path: "binding/ios",
            exclude: ["CobraAppTest"]
        )
    ]
)
