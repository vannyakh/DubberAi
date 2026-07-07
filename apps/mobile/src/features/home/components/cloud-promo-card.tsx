import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppSymbol } from '@/components';
import { appTheme } from '@/constants/app-theme';
import { fontSizes, radius, spacing } from '@/constants';

interface Props {
  onPress: () => void;
}

export function CloudPromoCard({ onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.proBadge}>
          <Text style={styles.proText}>CLOUD</Text>
        </View>
        <Text style={styles.title}>AI translation & sync</Text>
        <Text style={styles.body}>Sign in to dub videos in any language and back up projects.</Text>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Explore cloud features</Text>
        </View>
      </View>
      <View style={styles.art}>
        <AppSymbol name="film" size={40} tintColor={appTheme.accent} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: appTheme.dark,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  proBadge: {
    alignSelf: 'flex-start',
    backgroundColor: appTheme.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.sm,
  },
  proText: {
    fontSize: 10,
    fontWeight: '800',
    color: appTheme.accentText,
    letterSpacing: 0.6,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  body: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
  },
  cta: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: appTheme.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ctaText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: appTheme.accentText,
  },
  art: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
