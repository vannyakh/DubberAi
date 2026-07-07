import React, { useMemo } from 'react';
import { CaptionCue } from '@dubbercute/types';
import { findActiveCue } from '@dubbercute/player-core';
import { cn } from '@dubbercute/utils';

export interface SubtitleOverlayProps {
  cues: CaptionCue[];
  currentTime: number;
  showSpeaker?: boolean;
  className?: string;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  cues,
  currentTime,
  showSpeaker = false,
  className,
}) => {
  const activeCue = useMemo(() => findActiveCue(cues, currentTime), [cues, currentTime]);

  if (!activeCue) return null;

  return (
    <div
      className={cn(
        'absolute bottom-8 left-1/2 -translate-x-1/2 max-w-[80%] px-4 py-2 rounded-lg bg-black/70 text-white text-center text-sm md:text-base leading-snug pointer-events-none',
        className
      )}
    >
      {showSpeaker && activeCue.speaker && (
        <span className="font-bold mr-1.5">{activeCue.speaker}:</span>
      )}
      {activeCue.text}
    </div>
  );
};
