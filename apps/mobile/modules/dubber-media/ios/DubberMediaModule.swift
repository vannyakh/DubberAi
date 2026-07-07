import AVFoundation
import ExpoModulesCore

/**
 Local Expo module written in Swift. Uses AVFoundation to read container
 metadata and decode the audio track to PCM for timeline waveforms.
 */
public class DubberMediaModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DubberMedia")

    AsyncFunction("getVideoInfo") { (uri: String) -> [String: Any] in
      guard let url = Self.parseUrl(uri) else {
        throw Exception(name: "ERR_DUBBER_MEDIA", description: "Invalid uri: \(uri)")
      }
      let asset = AVURLAsset(url: url)
      let duration = CMTimeGetSeconds(asset.duration)

      var width = 0
      var height = 0
      var rotation = 0
      var frameRate: Float = 30

      if let track = asset.tracks(withMediaType: .video).first {
        let size = track.naturalSize.applying(track.preferredTransform)
        width = Int(abs(size.width))
        height = Int(abs(size.height))
        frameRate = track.nominalFrameRate
        let transform = track.preferredTransform
        let angle = atan2(transform.b, transform.a) * 180 / .pi
        rotation = (Int(angle.rounded()) % 360 + 360) % 360
      }

      let hasAudio = !asset.tracks(withMediaType: .audio).isEmpty

      return [
        "duration": duration.isFinite ? duration : 0,
        "width": width,
        "height": height,
        "rotation": rotation,
        "frameRate": frameRate,
        "hasAudio": hasAudio,
      ]
    }

    AsyncFunction("getAudioWaveform") { (uri: String, sampleCount: Int) -> [Double] in
      guard let url = Self.parseUrl(uri) else {
        throw Exception(name: "ERR_DUBBER_MEDIA", description: "Invalid uri: \(uri)")
      }
      return try Self.extractWaveform(url: url, sampleCount: max(16, min(sampleCount, 4096)))
    }
  }

  private static func parseUrl(_ uri: String) -> URL? {
    if uri.hasPrefix("/") {
      return URL(fileURLWithPath: uri)
    }
    return URL(string: uri)
  }

  private static func extractWaveform(url: URL, sampleCount: Int) throws -> [Double] {
    let asset = AVURLAsset(url: url)
    guard let track = asset.tracks(withMediaType: .audio).first else {
      return []
    }

    let reader = try AVAssetReader(asset: asset)
    let settings: [String: Any] = [
      AVFormatIDKey: kAudioFormatLinearPCM,
      AVLinearPCMBitDepthKey: 16,
      AVLinearPCMIsBigEndianKey: false,
      AVLinearPCMIsFloatKey: false,
      AVLinearPCMIsNonInterleaved: false,
    ]
    let output = AVAssetReaderTrackOutput(track: track, outputSettings: settings)
    output.alwaysCopiesSampleData = false
    reader.add(output)
    reader.startReading()

    let durationSeconds = CMTimeGetSeconds(asset.duration)
    guard durationSeconds > 0 else { return [] }

    var sums = [Double](repeating: 0, count: sampleCount)
    var counts = [Int](repeating: 0, count: sampleCount)

    while reader.status == .reading {
      guard let sampleBuffer = output.copyNextSampleBuffer(),
            let blockBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) else {
        continue
      }
      let pts = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sampleBuffer))
      let bucket = min(sampleCount - 1, max(0, Int(pts / durationSeconds * Double(sampleCount))))

      let length = CMBlockBufferGetDataLength(blockBuffer)
      var data = [Int16](repeating: 0, count: length / 2)
      data.withUnsafeMutableBytes { ptr in
        _ = CMBlockBufferCopyDataBytes(
          blockBuffer, atOffset: 0, dataLength: length, destination: ptr.baseAddress!)
      }
      // Sparse RMS sampling — every 32nd frame is plenty for a waveform.
      var i = 0
      while i < data.count {
        let normalized = Double(abs(Int32(data[i]))) / Double(Int16.max)
        sums[bucket] += normalized * normalized
        counts[bucket] += 1
        i += 32
      }
      CMSampleBufferInvalidate(sampleBuffer)
    }

    var peak = 1e-9
    var rms = [Double](repeating: 0, count: sampleCount)
    for i in 0..<sampleCount {
      rms[i] = counts[i] > 0 ? (sums[i] / Double(counts[i])).squareRoot() : 0
      peak = max(peak, rms[i])
    }
    return rms.map { min(1.0, $0 / peak) }
  }
}
