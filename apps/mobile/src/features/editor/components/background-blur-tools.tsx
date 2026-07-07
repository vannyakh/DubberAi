import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { VideoThumbnail } from 'expo-video';
import { AppSymbol } from '@/components';
import { radius, spacing } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';
import { CANVAS_BLUR_PRESETS, CanvasBlurType } from '../canvas-background';
import { blurBackgroundSourceForClip } from '../blur-background-source';
import { useEditorStore } from '../editor-store';
import { clipAtTime } from '../types';

const TILE = 64;

interface BackgroundBlurToolsProps {
  thumbnails?: Record<string, VideoThumbnail[]>;
  posterFrames?: Record<string, VideoThumbnail>;
}

function BlurThumbTile({
  source,
  blurRadius,
  scrim,
  selected,
  onPress,
  children,
}: {
  source: ImageSource | null;
  blurRadius: number;
  scrim: number;
  selected: boolean;
  onPress: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} accessibilityState={{ selected }}>
      <View style={[styles.tile, selected && styles.tileSelected]}>
        {children ??
          (source ? (
            <>
              <Image
                source={source}
                style={styles.thumb}
                contentFit="cover"
                blurRadius={blurRadius}
                transition={0}
                allowDownscaling
              />
              {scrim > 0 ? (
                <View
                  style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${scrim})` }]}
                />
              ) : null}
            </>
          ) : (
            <View style={styles.thumbFallback} />
          ))}
      </View>
    </Pressable>
  );
}

export function BackgroundBlurTools({ thumbnails, posterFrames }: BackgroundBlurToolsProps) {
  const clips = useEditorStore((s) => s.clips);
  const playhead = useEditorStore((s) => s.playhead);
  const canvasBlurType = useEditorStore((s) => s.canvasBlurType);
  const setCanvasBackgroundBlur = useEditorStore((s) => s.setCanvasBackgroundBlur);

  const thumbSource = useMemo((): ImageSource | null => {
    const active = clipAtTime(clips, playhead);
    if (!active) return null;
    const sourceTime = active.clip.trimStart + active.localTime;
    return blurBackgroundSourceForClip(
      active.clip,
      sourceTime,
      thumbnails?.[active.clip.uri],
      posterFrames?.[active.clip.uri],
    );
  }, [clips, playhead, posterFrames, thumbnails]);

  const isSelected = (id: CanvasBlurType) => canvasBlurType === id;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {CANVAS_BLUR_PRESETS.map((preset) => {
        if (preset.id === 'none') {
          return (
            <BlurThumbTile
              key={preset.id}
              source={null}
              blurRadius={0}
              scrim={0}
              selected={isSelected('none')}
              onPress={() => setCanvasBackgroundBlur('none')}
            >
              <View style={styles.noneInner}>
                <AppSymbol name="ban" size={26} tintColor={editorTheme.textSecondary} />
              </View>
            </BlurThumbTile>
          );
        }

        return (
          <BlurThumbTile
            key={preset.id}
            source={thumbSource}
            blurRadius={preset.radius}
            scrim={preset.scrim}
            selected={isSelected(preset.id)}
            onPress={() => setCanvasBackgroundBlur(preset.id)}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: editorTheme.surfaceRaised,
  },
  tileSelected: {
    borderColor: editorTheme.text,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    flex: 1,
    backgroundColor: editorTheme.surface,
  },
  noneInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: editorTheme.surfaceRaised,
  },
});
