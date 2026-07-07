#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef void (^FFmpegLogBlock)(void * _Nullable context, int32_t level, const char * _Nullable message);
typedef BOOL (^FFmpegCancelBlock)(void);

@interface FFmpegBridge : NSObject

+ (NSString *)getVersion;
+ (void)setLogCallback:(void * _Nullable)context
              callback:(FFmpegLogBlock)callback
    NS_SWIFT_NAME(setLogCallback(_:callback:));
+ (void)clearLogCallback;
+ (int32_t)executeWithArgs:(NSArray<NSString *> *)args
                  logLevel:(int32_t)logLevel
              shouldCancel:(FFmpegCancelBlock)shouldCancel
    NS_SWIFT_NAME(execute(args:logLevel:shouldCancel:));

@end

NS_ASSUME_NONNULL_END
