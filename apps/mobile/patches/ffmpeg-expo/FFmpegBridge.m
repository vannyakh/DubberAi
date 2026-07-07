#import "FFmpegBridge.h"
#import "FFmpeg.h"
#include <stdarg.h>
#include <string.h>

static void *gLogContext = NULL;
static FFmpegLogBlock gLogBlock = nil;

static void dubber_ffmpeg_log_callback(void *ptr, int level, const char *fmt, va_list vl) {
  if (!gLogBlock || !fmt) {
    return;
  }
  char message[1024];
  vsnprintf(message, sizeof(message), fmt, vl);
  gLogBlock(gLogContext, (int32_t)level, message);
}

static int dubber_execute_remux(const char *inputFile, const char *outputFile, FFmpegCancelBlock shouldCancel) {
  AVFormatContext *inputCtx = NULL;
  int ret = avformat_open_input(&inputCtx, inputFile, NULL, NULL);
  if (ret < 0) {
    return ret;
  }

  ret = avformat_find_stream_info(inputCtx, NULL);
  if (ret < 0) {
    avformat_close_input(&inputCtx);
    return ret;
  }

  AVFormatContext *outputCtx = NULL;
  ret = avformat_alloc_output_context2(&outputCtx, NULL, NULL, outputFile);
  if (ret < 0 || outputCtx == NULL) {
    avformat_close_input(&inputCtx);
    return ret < 0 ? ret : AVERROR(ENOMEM);
  }

  for (unsigned int i = 0; i < inputCtx->nb_streams; i++) {
    AVStream *inStream = inputCtx->streams[i];
    AVStream *outStream = avformat_new_stream(outputCtx, NULL);
    if (!outStream) {
      avformat_close_input(&inputCtx);
      if (!(outputCtx->oformat->flags & AVFMT_NOFILE)) {
        avio_closep(&outputCtx->pb);
      }
      avformat_free_context(outputCtx);
      return AVERROR(ENOMEM);
    }

    ret = avcodec_parameters_copy(outStream->codecpar, inStream->codecpar);
    if (ret < 0) {
      avformat_close_input(&inputCtx);
      if (!(outputCtx->oformat->flags & AVFMT_NOFILE)) {
        avio_closep(&outputCtx->pb);
      }
      avformat_free_context(outputCtx);
      return ret;
    }
    outStream->codecpar->codec_tag = 0;
  }

  if (!(outputCtx->oformat->flags & AVFMT_NOFILE)) {
    ret = avio_open(&outputCtx->pb, outputFile, AVIO_FLAG_WRITE);
    if (ret < 0) {
      avformat_close_input(&inputCtx);
      avformat_free_context(outputCtx);
      return ret;
    }
  }

  ret = avformat_write_header(outputCtx, NULL);
  if (ret < 0) {
    avformat_close_input(&inputCtx);
    if (!(outputCtx->oformat->flags & AVFMT_NOFILE)) {
      avio_closep(&outputCtx->pb);
    }
    avformat_free_context(outputCtx);
    return ret;
  }

  AVPacket *pkt = av_packet_alloc();
  while (av_read_frame(inputCtx, pkt) >= 0) {
    if (shouldCancel && shouldCancel()) {
      av_packet_free(&pkt);
      avformat_close_input(&inputCtx);
      av_write_trailer(outputCtx);
      if (!(outputCtx->oformat->flags & AVFMT_NOFILE)) {
        avio_closep(&outputCtx->pb);
      }
      avformat_free_context(outputCtx);
      return 255;
    }

    AVStream *inStream = inputCtx->streams[pkt->stream_index];
    AVStream *outStream = outputCtx->streams[pkt->stream_index];

    pkt->pts = av_rescale_q_rnd(pkt->pts, inStream->time_base, outStream->time_base,
                                AV_ROUND_NEAR_INF | AV_ROUND_PASS_MINMAX);
    pkt->dts = av_rescale_q_rnd(pkt->dts, inStream->time_base, outStream->time_base,
                                AV_ROUND_NEAR_INF | AV_ROUND_PASS_MINMAX);
    pkt->duration = av_rescale_q(pkt->duration, inStream->time_base, outStream->time_base);
    pkt->pos = -1;

    ret = av_interleaved_write_frame(outputCtx, pkt);
    av_packet_unref(pkt);
    if (ret < 0) {
      break;
    }
  }

  av_write_trailer(outputCtx);
  av_packet_free(&pkt);
  avformat_close_input(&inputCtx);
  if (!(outputCtx->oformat->flags & AVFMT_NOFILE)) {
    avio_closep(&outputCtx->pb);
  }
  avformat_free_context(outputCtx);
  return ret < 0 ? ret : 0;
}

@implementation FFmpegBridge

+ (NSString *)getVersion {
  return [NSString stringWithUTF8String:av_version_info()];
}

+ (void)setLogCallback:(void *)context callback:(FFmpegLogBlock)callback {
  gLogContext = context;
  gLogBlock = [callback copy];
  av_log_set_callback(dubber_ffmpeg_log_callback);
}

+ (void)clearLogCallback {
  gLogContext = NULL;
  gLogBlock = nil;
  av_log_set_callback(NULL);
}

+ (int32_t)executeWithArgs:(NSArray<NSString *> *)args
                  logLevel:(int32_t)logLevel
              shouldCancel:(FFmpegCancelBlock)shouldCancel {
  av_log_set_level(logLevel);

  const char *inputFile = NULL;
  const char *outputFile = NULL;

  for (NSUInteger i = 0; i < args.count; i++) {
    NSString *arg = args[i];
    if ([arg isEqualToString:@"-i"] && i + 1 < args.count) {
      inputFile = [args[++i] UTF8String];
    } else if ([arg hasPrefix:@"-"]) {
      continue;
    } else if (i == args.count - 1) {
      outputFile = [arg UTF8String];
    }
  }

  if (!inputFile || !outputFile) {
    return 1;
  }

  return dubber_execute_remux(inputFile, outputFile, shouldCancel);
}

@end
