import React, { forwardRef } from 'react';
import { CaptionCue } from '@video-voice-translator/types';
import { cn } from '@video-voice-translator/utils';
import { SubtitleOverlay } from './SubtitleOverlay';

export interface VideoPlayerProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  cues?: CaptionCue[];
  currentTime?: number;
  showSpeaker?: boolean;
  containerClassName?: string;
}

/**
 * Controlled video player with optional subtitle overlay.
 * Pass a ref to control playback from the outside (timeline sync, dub playback, etc).
 */
export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src, cues, currentTime = 0, showSpeaker, containerClassName, className, ...videoProps }, ref) => (
    <div className={cn('relative w-full h-full flex items-center justify-center bg-black', containerClassName)}>
      <video
        ref={ref}
        src={src}
        className={cn('max-w-full max-h-full', className)}
        {...videoProps}
      />
      {cues && cues.length > 0 && (
        <SubtitleOverlay cues={cues} currentTime={currentTime} showSpeaker={showSpeaker} />
      )}
    </div>
  )
);

VideoPlayer.displayName = 'VideoPlayer';
