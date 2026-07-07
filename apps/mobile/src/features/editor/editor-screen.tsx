import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontSizes, radius, spacing } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';
import { MediaPickerModal } from '@/features/media';
import { useEditorStore } from './editor-store';
import { useClipThumbnails } from './hooks/use-thumbnails';
import { useEditorMediaImport } from './hooks/use-editor-media-import';
import { useTimelinePlayer } from './hooks/use-timeline-player';
import { BackgroundPanel } from './components/background-panel';
import { ClipToolsBar } from './components/clip-tools-bar';
import { EditorEditPanel } from './components/editor-edit-panel';
import { ExportSheet } from './components/export-sheet';
import { FiltersPanel } from './components/filters-panel';
import { PlaybackControls } from './components/playback-controls';
import { Preview } from './components/preview';
import { RatioPanel } from './components/ratio-panel';
import { Timeline } from './components/timeline';
import { Toolbar } from './components/toolbar';
import { consumeEditorClips } from './editor-bootstrap';
import type { EditorEditingPanel } from './editing-panel';
import { getStudioHeaderHeight, STUDIO_EDITOR_FLEX, STUDIO_PREVIEW_FLEX } from './studio-layout';

export function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const clips = useEditorStore((s) => s.clips);
  const addClip = useEditorStore((s) => s.addClip);
  const addOverlay = useEditorStore((s) => s.addOverlay);
  const selectClip = useEditorStore((s) => s.selectClip);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const reset = useEditorStore((s) => s.reset);

  const player = useTimelinePlayer();
  const thumbnails = useClipThumbnails(clips);
  const {
    pickerVisible,
    pickerAdding,
    openMediaPicker,
    closeMediaPicker,
    confirmMediaPicker,
  } = useEditorMediaImport();

  const [textDraft, setTextDraft] = useState<string | null>(null);
  const [editingPanel, setEditingPanel] = useState<EditorEditingPanel | null>(null);

  const closeEditingPanel = () => setEditingPanel(null);

  const togglePanel = (panel: EditorEditingPanel) => {
    setEditingPanel((current) => (current === panel ? null : panel));
  };

  useEffect(() => () => reset(), [reset]);

  useEffect(() => {
    if (!id) return;
    const staged = consumeEditorClips(id);
    for (const clip of staged) addClip(clip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const handleDeselectClip = () => {
    selectClip(null);
    closeEditingPanel();
  };

  return (
    <View style={styles.root}>
      <View style={styles.topHalf}>
        <View style={[styles.previewArea, { paddingTop: getStudioHeaderHeight(insets.top) }]}>
          <Preview player={player} />
        </View>
      </View>

      <View style={styles.bottomHalf}>
        <PlaybackControls />
        <View style={styles.editorBody}>
          {editingPanel === 'filters' ? (
            <EditorEditPanel title="Filters" onDone={closeEditingPanel}>
              <FiltersPanel clipId={selectedClipId} />
            </EditorEditPanel>
          ) : editingPanel === 'ratio' ? (
            <EditorEditPanel title="Ratio" onDone={closeEditingPanel}>
              <RatioPanel />
            </EditorEditPanel>
          ) : editingPanel === 'background' ? (
            <EditorEditPanel title="Background" onDone={closeEditingPanel}>
              <BackgroundPanel />
            </EditorEditPanel>
          ) : (
            <Timeline thumbnails={thumbnails} onImport={openMediaPicker} onAddText={() => setTextDraft('')} />
          )}
        </View>
        <View style={[styles.toolbarSafe, { paddingBottom: insets.bottom }]}>
          {selectedClipId ? (
            <ClipToolsBar
              activePanel={editingPanel}
              onOpenPanel={togglePanel}
              onDeselect={handleDeselectClip}
            />
          ) : (
            <Toolbar
              onImport={openMediaPicker}
              onAddText={() => setTextDraft('')}
              activePanel={editingPanel}
              onOpenPanel={togglePanel}
            />
          )}
        </View>
      </View>

      <ExportSheet />

      <MediaPickerModal
        visible={pickerVisible}
        adding={pickerAdding}
        onClose={closeMediaPicker}
        onConfirm={confirmMediaPicker}
      />

      <Modal visible={textDraft !== null} transparent animationType="fade">
        <View style={styles.textBackdrop}>
          <View style={styles.textCard}>
            <Text style={styles.textCardTitle}>Add text overlay</Text>
            <TextInput
              style={styles.textInput}
              value={textDraft ?? ''}
              onChangeText={setTextDraft}
              placeholder="Your caption…"
              placeholderTextColor={editorTheme.textMuted}
              autoFocus
            />
            <View style={styles.textActions}>
              <TouchableOpacity onPress={() => setTextDraft(null)}>
                <Text style={styles.action}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={commitText}>
                <Text style={styles.actionPrimary}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: editorTheme.background,
  },
  topHalf: {
    flex: STUDIO_PREVIEW_FLEX,
    minHeight: 0,
    backgroundColor: editorTheme.preview,
  },
  previewArea: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: editorTheme.preview,
  },
  bottomHalf: {
    flex: STUDIO_EDITOR_FLEX,
    minHeight: 0,
    backgroundColor: editorTheme.background,
  },
  editorBody: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  toolbarSafe: {
    flexShrink: 0,
    backgroundColor: editorTheme.surface,
  },
  textBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  textCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: editorTheme.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: editorTheme.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  textCardTitle: {
    color: editorTheme.text,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  textInput: {
    color: editorTheme.text,
    borderWidth: 1,
    borderColor: editorTheme.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.sm,
    backgroundColor: editorTheme.surface,
  },
  textActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xl,
  },
  action: {
    color: editorTheme.textSecondary,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  actionPrimary: {
    color: editorTheme.accent,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
});
