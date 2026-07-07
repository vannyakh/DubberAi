import React, { useMemo } from 'react';
import { cn } from '@dubbercut/utils';
import { computeTicks, formatTimecode } from '@dubbercut/timeline-core';

interface TimeRulerProps {
  duration: number;
  pixelsPerSecond: number;
  className?: string;
}

export const TimeRuler: React.FC<TimeRulerProps> = ({ duration, pixelsPerSecond, className }) => {
  const ticks = useMemo(() => computeTicks(duration, pixelsPerSecond), [duration, pixelsPerSecond]);

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
