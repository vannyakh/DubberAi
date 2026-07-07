import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fontSizes, radius, spacing } from '@/constants';
import { appTheme } from '@/constants/app-theme';
import { useEditorStore } from '../editor-store';

const PHASE_LABEL: Record<string, string> = {
  preparing: 'Rendering overlays…',
  encoding: 'Encoding video…',
  saving: 'Saving to library…',
  done: 'Saved to your library',
  error: 'Export failed',
};

/** Modal progress sheet driven by the export pipeline state. */
export function ExportSheet() {
  const exportState = useEditorStore((s) => s.exportState);
  const setExportState = useEditorStore((s) => s.setExportState);

  const visible = exportState.phase !== 'idle';
  const dismissible = exportState.phase === 'done' || exportState.phase === 'error';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{PHASE_LABEL[exportState.phase] ?? 'Exporting…'}</Text>

          {exportState.phase === 'encoding' && (
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${exportState.progress * 100}%` }]}
              />
            </View>
          )}

          {exportState.error && <Text style={styles.error}>{exportState.error}</Text>}

          {dismissible && (
            <TouchableOpacity
              style={styles.button}
              onPress={() =>
                setExportState({ phase: 'idle', progress: 0, error: null, outputUri: null })
              }
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,17,17,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: appTheme.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: appTheme.border,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  title: {
    color: appTheme.text,
    fontSize: fontSizes.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: radius.full,
    backgroundColor: appTheme.surfaceMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: appTheme.accent,
  },
  error: {
    color: appTheme.danger,
    fontSize: fontSizes.xs,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: appTheme.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    color: appTheme.accentText,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
});
