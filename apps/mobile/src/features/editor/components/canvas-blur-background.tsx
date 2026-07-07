import React, { memo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { canvasBlurRadius, canvasBlurScrim, CanvasBlurType } from '../canvas-background';

interface CanvasBlurBackgroundProps {
  source: ImageSource | null;
  blurType: CanvasBlurType;
  recyclingKey: string;
  style?: ViewStyle;
}

/** Static blurred fill — single expo-image pass, no live BlurView compositing. */
export const CanvasBlurBackground = memo(function CanvasBlurBackground({
  source,
  blurType,
  recyclingKey,
  style,
}: CanvasBlurBackgroundProps) {
  const blurRadius = canvasBlurRadius(blurType);
  const scrim = canvasBlurScrim(blurType);

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, style]} pointerEvents="none">
      {source ? (
        <Image
          source={source}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={blurRadius}
          cachePolicy="memory-disk"
          recyclingKey={recyclingKey}
          priority="low"
          transition={0}
          allowDownscaling
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]} />
      )}
      {scrim > 0 ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${scrim})` }]} />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: '#1C1C1E',
  },
});
