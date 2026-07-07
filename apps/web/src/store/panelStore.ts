/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Persisted editor panel sizes (percentages), OpenCut-style panel store.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PanelSizes {
  /** Horizontal split inside the main content row */
  tools: number;
  preview: number;
  properties: number;
  /** Vertical split between main content and timeline */
  mainContent: number;
  timeline: number;
}

interface PanelState {
  panels: PanelSizes;
  setPanel: (panel: keyof PanelSizes, size: number) => void;
}

const DEFAULT_PANELS: PanelSizes = {
  tools: 22,
  preview: 56,
  properties: 22,
  mainContent: 70,
  timeline: 30,
};

export const usePanelStore = create<PanelState>()(
  persist(
    (set) => ({
      panels: DEFAULT_PANELS,
      setPanel: (panel, size) =>
        set((state) => ({ panels: { ...state.panels, [panel]: size } })),
    }),
    { name: "editor-panels" }
  )
);
