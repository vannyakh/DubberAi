import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import type { Asset as LibraryAsset } from 'expo-media-library/legacy';
import { create } from 'zustand';
import { clipsFromLibraryAssets } from '@/features/editor/services/media';
import { useMediaPicker } from '@/features/media';
import { createProjectFromClips } from '../create-project-from-footage';

interface CreateProjectUiState {
  creating: boolean;
  setCreating: (creating: boolean) => void;
}

const useCreateProjectUi = create<CreateProjectUiState>((set) => ({
  creating: false,
  setCreating: (creating) => set({ creating }),
}));

export function useCreateProject() {
  const router = useRouter();
  const creating = useCreateProjectUi((s) => s.creating);
  const setCreating = useCreateProjectUi((s) => s.setCreating);
  const picker = useMediaPicker();

  const startNewProject = useCallback(() => {
    if (creating) return;
    picker.openPicker();
  }, [creating, picker]);

  const confirmPicker = useCallback(
    async (assets: LibraryAsset[]) => {
      if (creating || assets.length === 0) return;
      setCreating(true);
      picker.setAdding(true);
      try {
        const clips = await clipsFromLibraryAssets(assets);
        const projectId = await createProjectFromClips(clips);
        picker.closePicker();
        if (projectId) {
          router.push({ pathname: '/editor/[id]', params: { id: projectId } });
        }
      } catch (err) {
        Alert.alert(
          'Could not create project',
          err instanceof Error ? err.message : 'Something went wrong.',
        );
      } finally {
        picker.setAdding(false);
        setCreating(false);
      }
    },
    [creating, picker, router, setCreating],
  );

  return {
    creating,
    startNewProject,
    pickerVisible: picker.visible,
    closePicker: picker.closePicker,
    confirmPicker,
    adding: picker.adding || creating,
  };
}

