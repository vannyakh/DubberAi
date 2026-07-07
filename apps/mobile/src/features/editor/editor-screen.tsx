import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { fontSizes, radius, spacing, theme } from '@/constants';
import { Screen } from '@/components';
import { useEditorStore } from './editor-store';
import { useClipThumbnails } from './hooks/use-thumbnails';
import { useTimelinePlayer } from './hooks/use-timeline-player';
import { ExportSheet } from './components/export-sheet';
import { FilterBar } from './components/filter-bar';
import { Preview } from './components/preview';
import { Timeline } from './components/timeline';
import { Toolbar } from './components/toolbar';
import { exportTimeline } from './services/export';
import { importVideoClip } from './services/media';

export function EditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const clips = useEditorStore((s) => s.clips);
  const overlays = useEditorStore((s) => s.overlays);
  const filterId = useEditorStore((s) => s.filterId);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const addClip = useEditorStore((s) => s.addClip);
  const addOverlay = useEditorStore((s) => s.addOverlay);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const setExportState = useEditorStore((s) => s.setExportState);
  const reset = useEditorStore((s) => s.reset);

  const player = useTimelinePlayer();
  const thumbnails = useClipThumbnails(clips);

  const [textDraft, setTextDraft] = useState<string | null>(null);

  // The editor is scoped to a single session per project visit.
  useEffect(() => () => reset(), [reset]);

  const importClip = async () => {
    const clip = await importVideoClip();
    if (clip) addClip(clip);
  };

  const startExport = async () => {
    setExportState({ phase: 'preparing', progress: 0, error: null, outputUri: null });
    try {
      const uri = await exportTimeline(clips, filterId, overlays, {
        onPhase: (phase) => setExportState({ phase }),
        onProgress: (progress) => setExportState({ progress }),
      });
      setExportState({ phase: 'done', progress: 1, outputUri: uri });
    } catch (err) {
      setExportState({
        phase: 'error',
        error: err instanceof Error ? err.message : 'Export failed',
      });
    }
  };

  const commitText = () => {
    if (textDraft && textDraft.trim()) {
      addOverlay({
        id: `text-${Date.now().toString(36)}`,
        text: textDraft.trim(),
        x: 0.35,
        y: 0.42,
        color: '#ffffff',
        fontSize: 22,
      });
    }
    setTextDraft(null);
  };

  return (
    <Screen>
      <LinearGradient
        colors={['rgba(45,212,191,0.08)', 'transparent', 'rgba(139,92,246,0.08)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.headerAction}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editor</Text>
          <TouchableOpacity onPress={startExport} disabled={clips.length === 0}>
            <Text style={[styles.headerAction, clips.length === 0 && styles.disabled]}>
              Export
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.previewArea}>
          <Preview player={player} />
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => setPlaying(!isPlaying)}
            disabled={clips.length === 0}
          >
            <Text style={styles.playIcon}>{isPlaying ? '❚❚' : '►'}</Text>
          </TouchableOpacity>
        </View>

        <FilterBar />

        <View style={styles.timelineArea}>
          <Timeline thumbnails={thumbnails} />
        </View>

        <Toolbar onImport={importClip} onAddText={() => setTextDraft('')} />
      </View>

      <ExportSheet />

      <Modal visible={textDraft !== null} transparent animationType="fade">
        <View style={styles.textBackdrop}>
          <View style={styles.textCard}>
            <Text style={styles.textCardTitle}>Add text overlay</Text>
            <TextInput
              style={styles.textInput}
              value={textDraft ?? ''}
              onChangeText={setTextDraft}
              placeholder="Your caption…"
              placeholderTextColor={theme.colors.textMuted}
              autoFocus
            />
            <View style={styles.textActions}>
              <TouchableOpacity onPress={() => setTextDraft(null)}>
                <Text style={styles.headerAction}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={commitText}>
                <Text style={styles.headerAction}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  headerAction: {
    color: theme.colors.accent,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
  previewArea: {
    flex: 1,
    marginHorizontal: spacing.lg,
  },
  playButton: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  playIcon: {
    color: '#fff',
    fontSize: fontSizes.md,
  },
  timelineArea: {
    paddingVertical: spacing.sm,
  },
  textBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  textCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  textCardTitle: {
    color: theme.colors.textPrimary,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  textInput: {
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.sm,
  },
  textActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xl,
  },
});
