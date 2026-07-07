import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fontSizes, radius, spacing, theme } from '@/constants';
import { useEditorStore } from '../editor-store';
import { GlassPanel } from './glass-panel';

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
        <GlassPanel style={styles.sheet} intensity={60}>
          <View style={styles.content}>
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
        </GlassPanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: theme.colors.accent,
  },
  error: {
    color: theme.colors.danger,
    fontSize: fontSizes.xs,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    color: theme.colors.textPrimary,
    fontSize: fontSizes.sm,
  },
});
