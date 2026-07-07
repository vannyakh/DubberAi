import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { SnapLine } from '../preview-snap';

interface Props {
  frameWidth: number;
  frameHeight: number;
  lines: SnapLine[];
}

/** Alignment guides shown while dragging footage on the preview canvas. */
export function PreviewSnapGuides({ frameWidth, frameHeight, lines }: Props) {
  if (frameWidth <= 0 || frameHeight <= 0 || lines.length === 0) return null;

  const centerX = frameWidth / 2;
  const centerY = frameHeight / 2;

  return (
    <View style={styles.layer} pointerEvents="none">
      {lines.map((line) => {
        if (line.type === 'vertical') {
          return (
            <View
              key={`v-${line.position}`}
              style={[styles.vertical, { left: centerX + line.position }]}
            />
          );
        }
        return (
          <View
            key={`h-${line.position}`}
            style={[styles.horizontal, { top: centerY + line.position }]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
  },
  vertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  horizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
});
