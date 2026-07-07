import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Rect } from '@shopify/react-native-skia';
import { editorTheme } from '@/constants/editor-theme';
import { downsampleWaveform } from '../timeline-utils';
import { clipDuration, EditorClip } from '../types';

interface Props {
  clips: EditorClip[];
  pxPerSecond: number;
  width: number;
  height: number;
}

/** GPU-drawn audio waveform lane synced with timeline scroll via parent transform. */
export function TimelineWaveformCanvas({ clips, pxPerSecond, width, height }: Props) {
  const bars = useMemo(() => {
    const items: { x: number; h: number; w: number }[] = [];
    let cursor = 0;

    clips.forEach((clip) => {
      const segWidth = Math.max(8, clipDuration(clip) * pxPerSecond);
      const barCount = Math.max(4, Math.floor(segWidth / 3));
      const samples = downsampleWaveform(clip, barCount);
      const barW = Math.max(1.5, segWidth / barCount - 1);

      samples.forEach((v, i) => {
        const barH = Math.max(2, v * height * 0.75);
        items.push({
          x: cursor + i * (segWidth / barCount),
          h: barH,
          w: barW,
        });
      });

      cursor += segWidth;
    });

    return items;
  }, [clips, pxPerSecond, height]);

  if (clips.length === 0 || width <= 0) return null;

  return (
    <Canvas style={[styles.canvas, { width, height }]}>
      {bars.map((bar, i) => (
        <Rect
          key={i}
          x={bar.x}
          y={(height - bar.h) / 2}
          width={bar.w}
          height={bar.h}
          color={editorTheme.accent}
          opacity={0.85}
        />
      ))}
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: editorTheme.surface,
  },
});
