import React, { useMemo } from 'react';
import { cn } from '@video-voice-translator/utils';
import { formatTimecode } from './time';

interface TimeRulerProps {
  duration: number;
  pixelsPerSecond: number;
  className?: string;
}

export const TimeRuler: React.FC<TimeRulerProps> = ({ duration, pixelsPerSecond, className }) => {
  const ticks = useMemo(() => {
    // Choose a tick interval that keeps labels at least ~60px apart
    const intervals = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    const interval = intervals.find((i) => i * pixelsPerSecond >= 60) ?? 300;
    const result: number[] = [];
    for (let t = 0; t <= duration; t += interval) result.push(t);
    return result;
  }, [duration, pixelsPerSecond]);

  return (
    <div
      className={cn('relative h-6 select-none text-[10px] text-neutral-500', className)}
      style={{ width: duration * pixelsPerSecond }}
    >
      {ticks.map((t) => (
        <div key={t} className="absolute top-0 h-full border-l border-neutral-400/40 pl-1" style={{ left: t * pixelsPerSecond }}>
          {formatTimecode(t)}
        </div>
      ))}
    </div>
  );
};
