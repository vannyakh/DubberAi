import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { contentAnchorStyle, containedMediaRect } from '../preview-content-rect';
import { EditorClip } from '../types';

const HANDLE = 22;
const HANDLE_VISUAL = 10;
const HANDLE_BORDER = 2;
const SELECTION_COLOR = '#00E8F2';

interface CornerGestures {
  topLeft: GestureType;
  topRight: GestureType;
  bottomLeft: GestureType;
  bottomRight: GestureType;
  rotate: GestureType;
}

interface Props {
  frameWidth: number;
  frameHeight: number;
  clip: EditorClip;
  contentStyle: AnimatedStyle<ViewStyle>;
  cornerGestures: CornerGestures;
}

function Handle({
  gesture,
  style,
}: {
  gesture: GestureType;
  style: object;
}) {
  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.handleHit, style]}>
        <View style={styles.handleVisual} />
      </View>
    </GestureDetector>
  );
}

/** CapCut-style bounding box with draggable corner handles. */
export function PreviewSelectionHandles({
  frameWidth,
  frameHeight,
  clip,
  contentStyle,
  cornerGestures,
}: Props) {
  const contentRect = useMemo(
    () => containedMediaRect(frameWidth, frameHeight, clip.width, clip.height),
    [clip.height, clip.width, frameHeight, frameWidth],
  );

  if (frameWidth <= 0 || frameHeight <= 0 || contentRect.width <= 0) return null;

  const anchorStyle = contentAnchorStyle(contentRect);

  return (
    <View style={styles.layer} pointerEvents="box-none">
      <Animated.View style={[styles.anchor, anchorStyle, contentStyle]} pointerEvents="box-none">
        <View style={styles.border} pointerEvents="none" />
        <Handle gesture={cornerGestures.topLeft} style={styles.topLeft} />
        <Handle gesture={cornerGestures.topRight} style={styles.topRight} />
        <Handle gesture={cornerGestures.bottomLeft} style={styles.bottomLeft} />
        <Handle gesture={cornerGestures.bottomRight} style={styles.bottomRight} />
        <View style={styles.rotateStem} pointerEvents="none" />
        <GestureDetector gesture={cornerGestures.rotate}>
          <View style={[styles.rotateKnobHit]}>
            <View style={styles.rotateKnobVisual} />
          </View>
        </GestureDetector>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
  },
  anchor: {
    position: 'absolute',
  },
  border: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderColor: SELECTION_COLOR,
  },
  handleHit: {
    position: 'absolute',
    width: HANDLE,
    height: HANDLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleVisual: {
    width: HANDLE_VISUAL,
    height: HANDLE_VISUAL,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    borderWidth: HANDLE_BORDER,
    borderColor: SELECTION_COLOR,
  },
  topLeft: {
    left: -HANDLE / 2,
    top: -HANDLE / 2,
  },
  topRight: {
    right: -HANDLE / 2,
    top: -HANDLE / 2,
  },
  bottomLeft: {
    left: -HANDLE / 2,
    bottom: -HANDLE / 2,
  },
  bottomRight: {
    right: -HANDLE / 2,
    bottom: -HANDLE / 2,
  },
  rotateStem: {
    position: 'absolute',
    top: -28,
    left: '50%',
    marginLeft: -1,
    width: 2,
    height: 20,
    backgroundColor: SELECTION_COLOR,
  },
  rotateKnobHit: {
    position: 'absolute',
    top: -36 - HANDLE / 2 + 7,
    left: '50%',
    marginLeft: -HANDLE / 2,
    width: HANDLE,
    height: HANDLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotateKnobVisual: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: HANDLE_BORDER,
    borderColor: SELECTION_COLOR,
  },
});
