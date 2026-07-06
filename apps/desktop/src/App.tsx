import React, { useRef, useState } from 'react';
import { Button } from '@video-voice-translator/ui';
import { VideoPlayer } from '@video-voice-translator/player';
import { Timeline, useTimelineZoom, formatTimecode } from '@video-voice-translator/timeline';
import { Track } from '@video-voice-translator/types';

export const App: React.FC = () => {
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { zoom, zoomIn, zoomOut } = useTimelineZoom();

  const openVideo = async () => {
    if (window.desktop) {
      const path = await window.desktop.openVideoDialog();
      if (path) setVideoPath(`file://${path}`);
    }
  };

  const tracks: Track[] = videoPath
    ? [
        {
          id: 'video-1',
          kind: 'video',
          name: 'Video',
          clips: [
            {
              id: 'clip-1',
              trackId: 'video-1',
              start: 0,
              duration: duration || 1,
              sourceOffset: 0,
              label: 'Main video',
            },
          ],
        },
      ]
    : [];

  return (
    <div className="h-full flex flex-col bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
        <span className="text-sm font-bold tracking-wide">Video Voice Translator — Desktop</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={zoomOut}>-</Button>
          <Button size="sm" variant="secondary" onClick={zoomIn}>+</Button>
          <Button size="sm" onClick={openVideo}>Open Video</Button>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex items-center justify-center">
        {videoPath ? (
          <VideoPlayer
            ref={videoRef}
            src={videoPath}
            controls
            currentTime={currentTime}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          />
        ) : (
          <div className="text-center space-y-3">
            <p className="text-neutral-400 text-sm">Open a local video file to get started.</p>
            <Button onClick={openVideo}>Open Video</Button>
          </div>
        )}
      </main>

      <footer className="border-t border-neutral-800 p-2">
        <div className="flex items-center justify-between text-xs text-neutral-400 px-1 pb-1">
          <span>{formatTimecode(currentTime)} / {formatTimecode(duration)}</span>
          <span>Zoom {zoom.toFixed(2)}x</span>
        </div>
        <Timeline
          tracks={tracks}
          duration={Math.max(duration, 1)}
          currentTime={currentTime}
          zoom={zoom}
          onSeek={(t) => {
            if (videoRef.current) videoRef.current.currentTime = t;
            setCurrentTime(t);
          }}
          className="h-24"
        />
      </footer>
    </div>
  );
};
