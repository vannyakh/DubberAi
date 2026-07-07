import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { VideoPlayer, VideoView } from 'expo-video';
import { Canvas, Fill, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { radius } from '@/constants';
import { useEditorStore } from '../editor-store';
import { FILTER_PRESETS, TextOverlay } from '../types';

interface PreviewProps {
  player: VideoPlayer;
}

/**
 * Video surface with a Skia canvas on top. The canvas draws the filter tint
 * and vignette on the GPU; text overlays are draggable via gesture-handler +
 * reanimated so positioning never touches the JS bridge mid-drag.
 */
export function Preview({ player }: PreviewProps) {
  const filterId = useEditorStore((s) => s.filterId);
  const overlays = useEditorStore((s) => s.overlays);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const preset = FILTER_PRESETS.find((p) => p.id === filterId) ?? FILTER_PRESETS[0];

  return (
    <View
      style={styles.container}
      onLayout={(e) => setSize(e.nativeEvent.layout)}
    >
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
      />

      {size.width > 0 && (preset.id !== 'none') && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {preset.tint !== 'transparent' && <Fill color={preset.tint} />}
          {preset.vignette > 0 && (
            <Rect x={0} y={0} width={size.width} height={size.height}>
              <RadialGradient
                c={vec(size.width / 2, size.height / 2)}
                r={Math.max(size.width, size.height) * 0.72}
                colors={['rgba(0,0,0,0)', `rgba(0,0,0,${preset.vignette})`]}
              />
            </Rect>
          )}
        </Canvas>
      )}

      {overlays.map((overlay) => (
        <DraggableOverlay key={overlay.id} overlay={overlay} bounds={size} />
      ))}
    </View>
  );
}

function DraggableOverlay({
  overlay,
  bounds,
}: {
  overlay: TextOverlay;
  bounds: { width: number; height: number };
}) {
  const updateOverlay = useEditorStore((s) => s.updateOverlay);
  const removeOverlay = useEditorStore((s) => s.removeOverlay);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const commit = (dx: number, dy: number) => {
    if (bounds.width === 0 || bounds.height === 0) return;
    updateOverlay(overlay.id, {
      x: Math.min(1, Math.max(0, overlay.x + dx / bounds.width)),
      y: Math.min(1, Math.max(0, overlay.y + dy / bounds.height)),
    });
    translateX.value = 0;
    translateY.value = 0;
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(commit)(e.translationX, e.translationY);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(removeOverlay)(overlay.id);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={Gesture.Exclusive(doubleTap, pan)}>
      <Animated.View
        style={[
          styles.overlay,
          {
            left: `${overlay.x * 100}%`,
            top: `${overlay.y * 100}%`,
          },
          animatedStyle,
        ]}
      >
        <Text
          style={[styles.overlayText, { color: overlay.color, fontSize: overlay.fontSize }]}
        >
          {overlay.text}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
  },
  overlayText: {
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
