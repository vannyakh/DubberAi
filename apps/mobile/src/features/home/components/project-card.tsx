import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Project } from '@dubbercut/types';
import { AppSymbol } from '@/components';
import { appTheme } from '@/constants/app-theme';
import { fontSizes, radius, spacing } from '@/constants';

interface Props {
  project: Project;
  onPress: () => void;
  onDelete: () => void;
}

export function ProjectCard({ project, onPress, onDelete }: Props) {
  const translated = !!project.targetLang;
  const hasVideo = !!project.videoUrl;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.thumb}>
        <AppSymbol
          name={hasVideo ? 'play' : 'folder'}
          size={22}
          tintColor={appTheme.accent}
        />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {project.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {translated ? `Translated · ${project.targetLang}` : hasVideo ? 'Ready to edit' : 'Draft project'}
        </Text>
        <View style={styles.badges}>
          <View style={[styles.badge, translated ? styles.badgeAccent : styles.badgeMuted]}>
            <Text style={[styles.badgeText, translated && styles.badgeTextAccent]}>
              {translated ? 'Translated' : 'Draft'}
            </Text>
          </View>
        </View>
      </View>
      <Pressable onPress={onDelete} hitSlop={12} style={styles.deleteBtn} accessibilityLabel="Delete project">
        <AppSymbol name="more" size={20} tintColor={appTheme.textMuted} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appTheme.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: appTheme.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: appTheme.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: appTheme.text,
  },
  meta: {
    fontSize: fontSizes.xs,
    color: appTheme.textMuted,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeMuted: {
    backgroundColor: appTheme.surfaceMuted,
  },
  badgeAccent: {
    backgroundColor: appTheme.accent + '44',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: appTheme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  badgeTextAccent: {
    color: appTheme.accentText,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
});
