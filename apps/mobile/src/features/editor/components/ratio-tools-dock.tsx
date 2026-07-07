import React from 'react';
import { View } from 'react-native';
import { RatioPanel } from './ratio-panel';
import { ToolsBottomSheetDock } from './tools-bottom-sheet-dock';

interface RatioToolsDockProps {
  active: boolean;
  onDone: () => void;
  bottomInset: number;
  toolbar: React.ReactNode;
}

/** Ratio presets in a bottom sheet; clip/main toolbar stays pinned below. */
export function RatioToolsDock({ active, onDone, bottomInset, toolbar }: RatioToolsDockProps) {
  return (
    <ToolsBottomSheetDock
      bottomInset={bottomInset}
      sheetOpen={active}
      title="Ratio"
      onDone={onDone}
      showApplyAll={false}
      toolbar={<View style={{ paddingBottom: bottomInset }}>{toolbar}</View>}
    >
      <RatioPanel />
    </ToolsBottomSheetDock>
  );
}
