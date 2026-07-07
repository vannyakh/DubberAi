import React, { PropsWithChildren, useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { editorTheme } from '@/constants/editor-theme';
import { useToolsBottomSheet } from '../hooks/use-tools-bottom-sheet';
import { BACKGROUND_DOCK_HEIGHT } from '../studio-layout';
import { toolsSheetHeight, ToolsBottomSheet } from './tools-bottom-sheet';

interface ToolsBottomSheetDockProps {
  bottomInset: number;
  sheetOpen: boolean;
  title: string;
  onDone: () => void;
  onApplyAll?: () => void;
  showApplyAll?: boolean;
  toolbar: React.ReactNode;
}

/** Pinned toolbar + animated tool sheet overlay (Background, Ratio, etc.). */
export function ToolsBottomSheetDock({
  bottomInset,
  sheetOpen,
  title,
  onDone,
  onApplyAll = () => {},
  showApplyAll = true,
  toolbar,
  children,
}: PropsWithChildren<ToolsBottomSheetDockProps>) {
  const { progress, open, close, mounted } = useToolsBottomSheet();
  const sheetHeight = toolsSheetHeight(bottomInset);

  useEffect(() => {
    if (sheetOpen) {
      open();
      return;
    }
    if (mounted) {
      close();
    }
  }, [sheetOpen, close, mounted, open]);

  const handleDone = useCallback(() => {
    if (sheetOpen || mounted) {
      close(onDone);
      return;
    }
    onDone();
  }, [close, mounted, onDone, sheetOpen]);

  return (
    <View style={[styles.dock, { height: BACKGROUND_DOCK_HEIGHT + bottomInset }]}>
      {mounted && children ? (
        <ToolsBottomSheet
          progress={progress}
          sheetHeight={sheetHeight}
          bottomInset={bottomInset}
          title={title}
          onApplyAll={onApplyAll}
          onDone={handleDone}
          showApplyAll={showApplyAll}
        >
          {children}
        </ToolsBottomSheet>
      ) : null}
      <View style={styles.barHost} pointerEvents="box-none">
        {toolbar}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    overflow: 'visible',
    backgroundColor: editorTheme.surface,
  },
  barHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    elevation: 10,
  },
});
