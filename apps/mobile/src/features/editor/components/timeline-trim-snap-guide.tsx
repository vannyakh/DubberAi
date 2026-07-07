import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { editorTheme } from '@/constants/editor-theme';
import { timelineTrimSnapLineX } from '../timeline-trim-snap';

interface TimelineTrimSnapGuideProps {
  height: number;
}

export function TimelineTrimSnapGuide({ height }: TimelineTrimSnapGuideProps) {
  const style = useAnimatedStyle(() => ({
    opacity: timelineTrimSnapLineX.value >= 0 ? 1 : 0,
    transform: [{ translateX: timelineTrimSnapLineX.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.line, { height }, style]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    top: 0,
    left: -1,
    width: 2,
    backgroundColor: editorTheme.accent,
    borderRadius: 1,
    zIndex: 25,
    shadowColor: editorTheme.accent,
    shadowOpacity: 0.45,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
});
