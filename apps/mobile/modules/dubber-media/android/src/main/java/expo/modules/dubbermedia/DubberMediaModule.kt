package expo.modules.dubbermedia

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.net.Uri
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.abs
import kotlin.math.min
import kotlin.math.sqrt

class MediaInfoException(message: String) :
  CodedException("ERR_DUBBER_MEDIA", message, null)

/**
 * Local Expo module written in Kotlin. Reads video metadata via
 * MediaMetadataRetriever and decodes audio to PCM with MediaExtractor +
 * MediaCodec to build timeline waveforms — no reflection, runs off the JS
 * thread (Function bodies marked async run on the module's dispatcher).
 */
class DubberMediaModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DubberMedia")

    AsyncFunction("getVideoInfo") { uri: String ->
      val retriever = MediaMetadataRetriever()
      try {
        setSource(retriever, uri)
        val durationMs =
          retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()
            ?: 0L
        val width =
          retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull()
            ?: 0
        val height =
          retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull()
            ?: 0
        val rotation =
          retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull()
            ?: 0
        val frameRate =
          retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_CAPTURE_FRAMERATE)
            ?.toFloatOrNull() ?: 30f
        val hasAudio =
          retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO) == "yes"

        mapOf(
          "duration" to durationMs / 1000.0,
          "width" to width,
          "height" to height,
          "rotation" to rotation,
          "frameRate" to frameRate,
          "hasAudio" to hasAudio
        )
      } catch (e: Exception) {
        throw MediaInfoException(e.message ?: "Failed to read video metadata")
      } finally {
        retriever.release()
      }
    }

    AsyncFunction("getAudioWaveform") { uri: String, sampleCount: Int ->
      try {
        extractWaveform(uri, sampleCount.coerceIn(16, 4096))
      } catch (e: Exception) {
        throw MediaInfoException(e.message ?: "Failed to extract waveform")
      }
    }
  }

  private fun setSource(retriever: MediaMetadataRetriever, uri: String) {
    val parsed = Uri.parse(uri)
    if (parsed.scheme == "content") {
      retriever.setDataSource(appContext.reactContext, parsed)
    } else {
      retriever.setDataSource(parsed.path ?: uri)
    }
  }

  private fun extractWaveform(uri: String, sampleCount: Int): List<Double> {
    val extractor = MediaExtractor()
    val parsed = Uri.parse(uri)
    if (parsed.scheme == "content") {
      val context = appContext.reactContext ?: throw MediaInfoException("No context")
      extractor.setDataSource(context, parsed, null)
    } else {
      extractor.setDataSource(parsed.path ?: uri)
    }

    var trackIndex = -1
    var format: MediaFormat? = null
    for (i in 0 until extractor.trackCount) {
      val f = extractor.getTrackFormat(i)
      if (f.getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true) {
        trackIndex = i
        format = f
        break
      }
    }
    if (trackIndex < 0 || format == null) {
      extractor.release()
      return emptyList()
    }

    extractor.selectTrack(trackIndex)
    val mime = format.getString(MediaFormat.KEY_MIME)!!
    val durationUs = if (format.containsKey(MediaFormat.KEY_DURATION)) {
      format.getLong(MediaFormat.KEY_DURATION)
    } else 0L

    val codec = MediaCodec.createDecoderByType(mime)
    codec.configure(format, null, null, 0)
    codec.start()

    val sums = DoubleArray(sampleCount)
    val counts = LongArray(sampleCount)
    val bufferInfo = MediaCodec.BufferInfo()
    var inputDone = false
    var outputDone = false

    while (!outputDone) {
      if (!inputDone) {
        val inIndex = codec.dequeueInputBuffer(10_000)
        if (inIndex >= 0) {
          val inputBuffer = codec.getInputBuffer(inIndex)!!
          val size = extractor.readSampleData(inputBuffer, 0)
          if (size < 0) {
            codec.queueInputBuffer(inIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
            inputDone = true
          } else {
            codec.queueInputBuffer(inIndex, 0, size, extractor.sampleTime, 0)
            extractor.advance()
          }
        }
      }

      val outIndex = codec.dequeueOutputBuffer(bufferInfo, 10_000)
      if (outIndex >= 0) {
        if (bufferInfo.size > 0 && durationUs > 0) {
          val outputBuffer = codec.getOutputBuffer(outIndex)!!
          accumulatePcm(outputBuffer, bufferInfo, durationUs, sums, counts)
        }
        codec.releaseOutputBuffer(outIndex, false)
        if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
          outputDone = true
        }
      }
    }

    codec.stop()
    codec.release()
    extractor.release()

    var peak = 1e-9
    val rms = DoubleArray(sampleCount) { i ->
      val v = if (counts[i] > 0) sqrt(sums[i] / counts[i]) else 0.0
      if (v > peak) peak = v
      v
    }
    return rms.map { min(1.0, it / peak) }
  }

  private fun accumulatePcm(
    buffer: ByteBuffer,
    info: MediaCodec.BufferInfo,
    durationUs: Long,
    sums: DoubleArray,
    counts: LongArray
  ) {
    val bucket = ((info.presentationTimeUs.toDouble() / durationUs) * sums.size)
      .toInt()
      .coerceIn(0, sums.size - 1)
    val shorts = buffer.order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
    // Sample sparsely — RMS over every 32nd frame is plenty for a waveform.
    var i = 0
    while (i < shorts.limit()) {
      val normalized = abs(shorts.get(i).toDouble()) / Short.MAX_VALUE
      sums[bucket] += normalized * normalized
      counts[bucket]++
      i += 32
    }
  }
}
