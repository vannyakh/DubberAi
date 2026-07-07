import React, { useEffect, useState } from 'react';
import { VideoThumbnail } from 'expo-video';
import { BACKGROUND_TOOLS, BackgroundToolId, sheetOpenForBackgroundTool } from '../background-tool';
import { BackgroundBlurTools } from './background-blur-tools';
import { BackgroundColorTools } from './background-color-tools';
import { BackgroundToolsBar } from './background-tools-bar';
import { ToolsBottomSheetDock } from './tools-bottom-sheet-dock';

interface BackgroundToolsDockProps {
  activeTool: BackgroundToolId | null;
  onSelectTool: (tool: BackgroundToolId | null) => void;
  onBack: () => void;
  bottomInset: number;
  thumbnails?: Record<string, VideoThumbnail[]>;
  posterFrames?: Record<string, VideoThumbnail>;
}

function toolTitle(tool: BackgroundToolId | null): string {
  if (!tool) return 'Background';
  return BACKGROUND_TOOLS.find((t) => t.id === tool)?.label ?? 'Background';
}

/** Minimal dock footprint; toolbar + sheet overlay upward from the bottom. */
export function BackgroundToolsDock({
  activeTool,
  onSelectTool,
  onBack,
  bottomInset,
  thumbnails,
  posterFrames,
}: BackgroundToolsDockProps) {
  const sheetOpen = sheetOpenForBackgroundTool(activeTool);
  const [displayTool, setDisplayTool] = useState<BackgroundToolId | null>(null);

  useEffect(() => {
    if (sheetOpen && activeTool) {
      setDisplayTool(activeTool);
    }
  }, [activeTool, sheetOpen]);

  const handleSelectTool = (tool: BackgroundToolId) => {
    if (activeTool === tool && sheetOpenForBackgroundTool(tool)) {
      onSelectTool(null);
      return;
    }
    onSelectTool(tool);
  };

  const handleBack = () => {
    if (sheetOpen) {
      onSelectTool(null);
      return;
    }
    onBack();
  };

  return (
    <ToolsBottomSheetDock
      bottomInset={bottomInset}
      sheetOpen={sheetOpen}
      title={toolTitle(displayTool)}
      onDone={() => onSelectTool(null)}
      toolbar={
        <BackgroundToolsBar
          activeTool={activeTool}
          onSelectTool={handleSelectTool}
          onBack={handleBack}
          bottomInset={bottomInset}
        />
      }
    >
      {displayTool === 'blur' ? (
        <BackgroundBlurTools thumbnails={thumbnails} posterFrames={posterFrames} />
      ) : displayTool === 'color' ? (
        <BackgroundColorTools />
      ) : null}
    </ToolsBottomSheetDock>
  );
}
