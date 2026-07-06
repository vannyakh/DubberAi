/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { ActiveTab } from '@video-voice-translator/types';

interface StudioState {
  sidebarOpen: boolean;
  editorOpen: boolean;
  activeTab: ActiveTab;
  originalVolume: number;
  voiceVolume: number;
  
  setSidebarOpen: (open: boolean) => void;
  setEditorOpen: (open: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;
  toggleSidebar: () => void;
  toggleEditor: () => void;
  setOriginalVolume: (vol: number) => void;
  setVoiceVolume: (vol: number) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  sidebarOpen: true,
  editorOpen: true,
  activeTab: 'dub',
  originalVolume: 0.2,
  voiceVolume: 1.0,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setEditorOpen: (open) => set({ editorOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleEditor: () => set((state) => ({ editorOpen: !state.editorOpen })),
  setOriginalVolume: (vol) => set({ originalVolume: vol }),
  setVoiceVolume: (vol) => set({ voiceVolume: vol }),
}));
