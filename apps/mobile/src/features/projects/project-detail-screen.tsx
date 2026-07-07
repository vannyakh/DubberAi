import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { toSRT } from '@dubbercute/captions';
import { Button, ErrorText, Screen, TextField } from '@/components';
import { fontSizes, radius, spacing, TARGET_LANGUAGES, theme } from '@/constants';
import { useCues } from '@/hooks';
import { apiClient } from '@/libs/api';
import { useProjectsStore } from '@/stores';

export function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { projects, fetch, update } = useProjectsStore();
  const project = projects.find((p) => p.id === id);

  const [transcript, setTranscript] = useState(project?.transcript || '');
  const [translated, setTranslated] = useState(project?.translatedText || '');
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deep links can land here before the projects list is loaded.
  useEffect(() => {
    if (!project) fetch();
  }, [project, fetch]);

  useEffect(() => {
    if (project) {
      setTranscript(project.transcript || '');
      setTranslated(project.translatedText || '');
    }
    // Only sync when a different project is loaded, not on every store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  const cues = useCues(transcript, translated);

  if (!project) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      </Screen>
    );
  }

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await update(project.id, { transcript, translatedText: translated });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const translate = async (language: string) => {
    if (!transcript) return;
    setTranslating(true);
    setError(null);
    try {
      const { result } = await apiClient.translate(transcript, language);
      setTranslated(result);
      await update(project.id, { translatedText: result, targetLang: language });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const shareCaptions = async () => {
    if (cues.length === 0) return;
    await Share.share({ title: `${project.name}.srt`, message: toSRT(cues) });
  };

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {project.name}
          </Text>
          <TouchableOpacity onPress={save} disabled={saving}>
            <Text style={styles.back}>{saving ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <ErrorText message={error} />

        <Text style={styles.label}>Transcript</Text>
        <TextField
          multiline
          value={transcript}
          onChangeText={setTranscript}
          placeholder="[00:12] Speaker 1: Hello..."
        />

        <Text style={styles.label}>AI Translation</Text>
        <View style={styles.langRow}>
          {TARGET_LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[styles.langChip, project.targetLang === lang && styles.langChipActive]}
              onPress={() => translate(lang)}
              disabled={translating}
            >
              <Text style={styles.langChipText}>{lang}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {translating && (
          <ActivityIndicator color={theme.colors.accent} style={{ marginVertical: spacing.md }} />
        )}

        <TextField
          multiline
          value={translated}
          onChangeText={setTranslated}
          placeholder="Translation appears here — edit captions freely."
        />

        <Button
          title={`Share captions (.srt) — ${cues.length} cues`}
          onPress={shareCaptions}
          disabled={cues.length === 0}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  back: {
    color: theme.colors.accent,
    fontSize: fontSizes.sm,
  },
  title: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  langChip: {
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: theme.colors.surface,
  },
  langChipActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '22',
  },
  langChipText: {
    color: theme.colors.textPrimary,
    fontSize: fontSizes.xs,
  },
});
