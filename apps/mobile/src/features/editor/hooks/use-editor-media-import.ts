import { useCallback } from 'react';
import { Alert } from 'react-native';
import type { Asset as LibraryAsset } from 'expo-media-library/legacy';
import { useMediaPicker } from '@/features/media';
import { clipsFromLibraryAssets } from '../services/media';
import { useEditorStore } from '../editor-store';

export function useEditorMediaImport() {
  const addClip = useEditorStore((s) => s.addClip);
  const picker = useMediaPicker();

  const openMediaPicker = useCallback(() => {
    picker.openPicker();
  }, [picker]);

  const confirmMediaPicker = useCallback(
    async (assets: LibraryAsset[]) => {
      if (picker.adding || assets.length === 0) return;
      picker.setAdding(true);
      try {
        const clips = await clipsFromLibraryAssets(assets);
        for (const clip of clips) addClip(clip);
        picker.closePicker();
      } catch (err) {
        Alert.alert(
          'Could not add media',
          err instanceof Error ? err.message : 'Something went wrong.',
        );
      } finally {
        picker.setAdding(false);
      }
    },
    [addClip, picker],
  );

  return {
    pickerVisible: picker.visible,
    pickerAdding: picker.adding,
    openMediaPicker,
    closeMediaPicker: picker.closePicker,
    confirmMediaPicker,
  };
}
