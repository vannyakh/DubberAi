import React, { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { radius } from '@/constants';

interface GlassPanelProps {
  style?: ViewStyle;
  intensity?: number;
}

/**
 * Frosted-glass surface: a soft cyan/purple gradient glow underneath a native
 * blur layer, per the liquid-glass design language.
 */
export function GlassPanel({ children, style, intensity = 40 }: PropsWithChildren<GlassPanelProps>) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={['rgba(45,212,191,0.16)', 'rgba(139,92,246,0.14)', 'rgba(14,165,233,0.10)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  content: {
    flex: 1,
  },
});
