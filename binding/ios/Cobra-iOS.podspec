Pod::Spec.new do |s|
    s.name = 'Cobra-iOS'
    s.module_name = 'Cobra'
    s.version = '2.0.0'
    s.license = {:type => 'Apache 2.0'}
    s.summary = 'iOS binding for Picovoice\'s Cobra voice activity detection (VAD) engine.'
    s.description =
    <<-DESC
    Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

    Cobra is a highly-accurate and lightweight voice activity detection (VAD) engine.
    DESC
    s.homepage = 'https://github.com/Picovoice/cobra/tree/master/binding/ios'
    s.author = { 'Picovoice' => 'hello@picovoice.ai' }
    s.source = { :git => "https://github.com/Picovoice/cobra.git", :tag => "Cobra-iOS-v2.0.0" }
    s.ios.deployment_target = '11.0'
    s.swift_version = '5.0'
    s.vendored_frameworks = 'lib/ios/PvCobra.xcframework'
    s.source_files = 'binding/ios/*.{swift}'
    s.exclude_files = 'binding/ios/CobraAppTest/**'
  end
