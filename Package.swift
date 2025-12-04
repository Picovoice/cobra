// swift-tools-version:5.7
import PackageDescription

let package = Package(
    name: "Cobra-iOS",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "Cobra",
            targets: ["Cobra"]
        )
    ],
    targets: [
        .binaryTarget(
            name: "PvCobra",
            path: "lib/ios/PvCobra.xcframework"
        ),
        .target(
            name: "Cobra",
            dependencies: ["PvCobra"],
            path: ".",
            exclude: [
                "binding/ios/CobraAppTest",
                "demo"
            ],
            sources: [
                "binding/ios/Cobra.swift",
                "binding/ios/CobraErrors.swift"
            ]
        )
    ]
)
