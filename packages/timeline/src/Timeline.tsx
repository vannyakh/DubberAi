import React, { useCallback, useRef } from 'react';
import { Clip, Track } from '@dubbercute/types';
import { cn } from '@dubbercute/utils';
import { TimeRuler } from './TimeRuler';

export interface TimelineProps {
  tracks: Track[];
  duration: number;
  currentTime: number;
  /** Horizontal zoom factor; 1 = 10px per second */
  zoom?: number;
  selectedClipId?: string | null;
  onSeek?: (time: number) => void;
  onSelectClip?: (clip: Clip | null) => void;
  className?: string;
}

const BASE_PIXELS_PER_SECOND = 10;
const TRACK_HEIGHT = 44;

const trackColors: Record<Track['kind'], string> = {
  video: 'bg-sky-500/70 border-sky-400',
  audio: 'bg-emerald-500/70 border-emerald-400',
  caption: 'bg-amber-500/70 border-amber-400',
  overlay: 'bg-fuchsia-500/70 border-fuchsia-400',
};

export const Timeline: React.FC<TimelineProps> = ({
  tracks,
  duration,
  currentTime,
  zoom = 1,
  selectedClipId,
  onSeek,
  onSelectClip,
  className,
}) => {
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSeek || !scrollRef.current) return;
      const rect = scrollRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollRef.current.scrollLeft;
      onSeek(Math.max(0, Math.min(x / pixelsPerSecond, duration)));
    },
    [onSeek, pixelsPerSecond, duration]
  );

  return (
    <div className={cn('flex flex-col overflow-hidden', className)}>
      <div ref={scrollRef} className="overflow-x-auto" onClick={handleSeek}>
        <TimeRuler duration={duration} pixelsPerSecond={pixelsPerSecond} />
        <div className="relative" style={{ width: duration * pixelsPerSecond }}>
          {tracks.map((track) => (
            <div
              key={track.id}
              className="relative border-b border-neutral-500/20"
              style={{ height: TRACK_HEIGHT }}
            >
              {track.clips.map((clip) => (
                <button
                  key={clip.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectClip?.(clip.id === selectedClipId ? null : clip);
                  }}
                  className={cn(
                    'absolute top-1 bottom-1 rounded-md border text-left px-2 text-[10px] font-semibold text-white truncate cursor-pointer',
                    trackColors[track.kind],
                    clip.id === selectedClipId && 'ring-2 ring-white'
                  )}
                  style={{
                    left: clip.start * pixelsPerSecond,
                    width: Math.max(clip.duration * pixelsPerSecond, 8),
                  }}
                >
                  {clip.label || track.name}
                </button>
              ))}
            </div>
          ))}
          <div
            className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none"
            style={{ left: currentTime * pixelsPerSecond }}
          />
        </div>
      </div>
    </div>
  );
};
