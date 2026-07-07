import { useCallback } from 'react';
import { Alert } from 'react-native';
import type { Asset as LibraryAsset } from 'expo-media-library/legacy';
import { useMediaPicker } from '@/features/media';
import { useEditorStore } from '../editor-store';
import { mediaOverlayFromLibraryAsset } from '../services/media-overlay';

export function useEditorOverlayImport() {
  const addMediaOverlay = useEditorStore((s) => s.addMediaOverlay);
  const updateMediaOverlay = useEditorStore((s) => s.updateMediaOverlay);
  const selectedMediaOverlayId = useEditorStore((s) => s.selectedMediaOverlayId);
  const mediaOverlays = useEditorStore((s) => s.mediaOverlays);
  const playhead = useEditorStore((s) => s.playhead);
  const picker = useMediaPicker();

  const openOverlayPicker = useCallback(() => {
    picker.openPicker();
  }, [picker]);

  const confirmOverlayPicker = useCallback(
    async (assets: LibraryAsset[]) => {
      if (picker.adding || assets.length === 0) return;
      picker.setAdding(true);
      try {
        const selected = selectedMediaOverlayId
          ? mediaOverlays.find((o) => o.id === selectedMediaOverlayId)
          : null;

        const overlay = await mediaOverlayFromLibraryAsset(
          assets[0],
          selected?.startTime ?? playhead,
          selected?.trackIndex ?? 0,
        );

        if (!overlay) return;

        if (selected) {
          updateMediaOverlay(selected.id, {
            uri: overlay.uri,
            libraryAssetId: overlay.libraryAssetId,
            mediaType: overlay.mediaType,
            sourceDuration: overlay.sourceDuration,
            trimStart: overlay.trimStart,
            trimEnd: overlay.trimEnd,
            width: overlay.width,
            height: overlay.height,
          });
        } else {
          addMediaOverlay(overlay);
        }

        picker.closePicker();
      } catch (err) {
        Alert.alert(
          'Could not add overlay',
          err instanceof Error ? err.message : 'Something went wrong.',
        );
      } finally {
        picker.setAdding(false);
      }
    },
    [
      addMediaOverlay,
      mediaOverlays,
      picker,
      playhead,
      selectedMediaOverlayId,
      updateMediaOverlay,
    ],
  );

  return {
    overlayPickerVisible: picker.visible,
    overlayPickerAdding: picker.adding,
    openOverlayPicker,
    closeOverlayPicker: picker.closePicker,
    confirmOverlayPicker,
  };
}
