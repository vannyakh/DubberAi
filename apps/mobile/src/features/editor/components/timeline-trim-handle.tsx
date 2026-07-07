import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { editorTheme } from '@/constants/editor-theme';
import type { TrimHandleEdge } from '../hooks/use-timeline-trim-handle';

interface TimelineTrimHandleProps {
  edge: TrimHandleEdge;
  gesture: GestureType;
  height: number;
  isDragging: SharedValue<number>;
}

export function TimelineTrimHandle({ edge, gesture, height, isDragging }: TimelineTrimHandleProps) {
  const barStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value ? 1 : 0.88,
    transform: [
      { scaleX: isDragging.value ? 1.4 : 1 },
      { scaleY: isDragging.value ? 1.06 : 1 },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[
          styles.hit,
          edge === 'in' ? styles.hitIn : styles.hitOut,
          { height },
        ]}
      >
        <Animated.View style={[styles.bar, barStyle]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hit: {
    position: 'absolute',
    top: 0,
    width: 28,
    zIndex: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitIn: {
    left: -4,
  },
  hitOut: {
    right: -4,
  },
  bar: {
    width: 4,
    height: '90%',
    borderRadius: 2,
    backgroundColor: editorTheme.accent,
  },
});
