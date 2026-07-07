require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoFFmpeg'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = 'https://github.com/anthropics/expo-ffmpeg'
  s.platform       = :ios, '13.0'
  s.swift_version  = '5.4'
  s.source         = { :git => 'https://github.com/anthropics/expo-ffmpeg.git', :tag => "v#{s.version}" }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,mm,swift}'
  s.public_header_files = 'FFmpegBridge.h'
  s.exclude_files = 'Frameworks/**/*', 'FFmpegBridge.swift', 'ExpoFFmpeg-Bridging-Header.h'

  s.vendored_frameworks = 'Frameworks/FFmpeg.xcframework'

  s.frameworks = 'AudioToolbox', 'AVFoundation', 'CoreMedia', 'VideoToolbox', 'CoreVideo', 'CoreAudio'
  s.libraries = 'z', 'bz2', 'iconv'

  ffmpeg_ios = File.join(__dir__, 'Frameworks/FFmpeg.xcframework/ios-arm64/libffmpeg.a')
  ffmpeg_sim = File.join(__dir__, 'Frameworks/FFmpeg.xcframework/ios-arm64_x86_64-simulator/libffmpeg.a')

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'HEADER_SEARCH_PATHS' => '"$(PODS_TARGET_SRCROOT)/Frameworks/FFmpeg.xcframework/ios-arm64/Headers" "$(PODS_TARGET_SRCROOT)/Frameworks/FFmpeg.xcframework/ios-arm64_x86_64-simulator/Headers"',
    'OTHER_LDFLAGS[sdk=iphoneos*]' => "$(inherited) -force_load \"#{ffmpeg_ios}\" -lz -lbz2 -liconv",
    'OTHER_LDFLAGS[sdk=iphonesimulator*]' => "$(inherited) -force_load \"#{ffmpeg_sim}\" -lz -lbz2 -liconv",
    'ENABLE_BITCODE' => 'NO'
  }

  s.user_target_xcconfig = {
    'ENABLE_BITCODE' => 'NO',
    'OTHER_LDFLAGS[sdk=iphoneos*]' => "-force_load \"#{ffmpeg_ios}\"",
    'OTHER_LDFLAGS[sdk=iphonesimulator*]' => "-force_load \"#{ffmpeg_sim}\""
  }
end
