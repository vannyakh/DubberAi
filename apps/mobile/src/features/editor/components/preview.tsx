import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { VideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { Canvas, Fill, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { resolveCanvasAspectRatio } from '../aspect-ratios';
import { useEditorStore } from '../editor-store';
import { fitSizeToAspect } from '../preview-aspect';
import { clipAtTime, FILTER_PRESETS, TextOverlay } from '../types';

interface PreviewProps {
  player: VideoPlayer;
}

/**
 * Video surface with a Skia canvas on top. The canvas draws the filter tint
 * and vignette on the GPU; text overlays are draggable via gesture-handler +
 * reanimated so positioning never touches the JS bridge mid-drag.
 */
export function Preview({ player }: PreviewProps) {
  const clips = useEditorStore((s) => s.clips);
  const playhead = useEditorStore((s) => s.playhead);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const globalFilterId = useEditorStore((s) => s.filterId);
  const canvasAspectId = useEditorStore((s) => s.canvasAspectId);
  const canvasBackground = useEditorStore((s) => s.canvasBackground);
  const overlays = useEditorStore((s) => s.overlays);
  const [available, setAvailable] = useState({ width: 0, height: 0 });

  const active = clipAtTime(clips, playhead);
  const selectedClip = selectedClipId ? clips.find((c) => c.id === selectedClipId) : null;
  const filterId = selectedClip?.filterId ?? active?.clip.filterId ?? globalFilterId;
  const preset = FILTER_PRESETS.find((p) => p.id === filterId) ?? FILTER_PRESETS[0];
  const showImage = active?.clip.mediaType === 'image';

  const aspectRatio = useMemo(
    () => resolveCanvasAspectRatio(clips, canvasAspectId),
    [clips, canvasAspectId],
  );
  const frame = useMemo(
    () => fitSizeToAspect(available.width, available.height, aspectRatio),
    [available.width, available.height, aspectRatio],
  );

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setAvailable({ width, height });
      }}
    >
      <View
        style={[
          styles.frame,
          { backgroundColor: canvasBackground },
          frame.width > 0 && frame.height > 0
            ? { width: frame.width, height: frame.height }
            : styles.frameFallback,
        ]}
      >
        {showImage && active ? (
          <Image source={{ uri: active.clip.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
        ) : (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            nativeControls={false}
          />
        )}

        {frame.width > 0 && preset.id !== 'none' && (
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            {preset.tint !== 'transparent' && <Fill color={preset.tint} />}
            {preset.vignette > 0 && (
              <Rect x={0} y={0} width={frame.width} height={frame.height}>
                <RadialGradient
                  c={vec(frame.width / 2, frame.height / 2)}
                  r={Math.max(frame.width, frame.height) * 0.72}
                  colors={['rgba(0,0,0,0)', `rgba(0,0,0,${preset.vignette})`]}
                />
              </Rect>
            )}
          </Canvas>
        )}

        {overlays.map((overlay) => (
          <DraggableOverlay key={overlay.id} overlay={overlay} bounds={frame} />
        ))}
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  frame: {
    overflow: 'hidden',
    borderRadius: 2,
  },
  frameFallback: {
    flex: 1,
    alignSelf: 'stretch',
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
