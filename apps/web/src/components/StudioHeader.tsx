/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Undo2 as IconArrowBackUp,
  Redo2 as IconArrowForwardUp,
  RectangleHorizontal as IconAspectRatio,
  ChevronDown as IconChevronDown,
  Settings as IconSettings,
  Download as IconDownload,
  Trash2 as IconTrash,
  Sun as IconSun,
  Moon as IconMoon,
  ArrowLeft
} from 'lucide-react';
import { useStudio } from '../hooks/useStudio';
import { useTheme, useThemeClasses } from '../context/ThemeContext';

interface StudioHeaderProps {
  onOpenSettings?: () => void;
  onOpenExport?: () => void;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({ onOpenSettings, onOpenExport }) => {
  const {
    projectName,
    setProjectName,
    resetProject,
    exitProject,
    targetLang,
    videoFile,
  } = useStudio();

  const { theme, toggleTheme } = useTheme();
  const t = useThemeClasses();

  const videoMB = videoFile?.size ? (videoFile.size / (1024 * 1024)).toFixed(1) : '0';

  return (
    <div className={`h-14 shrink-0 border-b ${t.borderB} flex items-center justify-between px-4 ${t.panelBg} z-20`}>
      <div className="flex items-center gap-4">
        {/* Logo/Brand with Back action */}
        <button 
          onClick={exitProject}
          className={`flex items-center gap-2 cursor-pointer group p-1 rounded-md ${t.hoverBg}`}
          title="Exit to project manager"
        >
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-violet-500/10 group-hover:bg-violet-500 transition-colors">
            <ArrowLeft size={14} />
          </div>
          <span className={`text-sm font-semibold tracking-tight ${t.textPrimary}`}>
            Vokop Translate
          </span>
        </button>

        <div className={`h-5 w-px ${t.dark ? "bg-neutral-800" : "bg-neutral-200"}`} />
        
        <input
          value={projectName || ''}
          onChange={(e) => setProjectName?.(e.target.value)}
          placeholder="Untitled project"
          className={`text-sm bg-transparent border-none outline-none w-40 font-medium ${t.textSecondary} focus:ring-1 focus:ring-violet-500 rounded px-1`}
        />
      </div>

      <div className="flex items-center gap-1">
        <button className={`p-2 rounded-md ${t.hoverBg} ${t.textMuted}`} title="Undo">
          <IconArrowBackUp size={17} strokeWidth={1.75} />
        </button>
        <button className={`p-2 rounded-md ${t.hoverBg} ${t.textMuted}`} title="Redo">
          <IconArrowForwardUp size={17} strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Dynamic target lang display */}
        <div className={`flex items-center gap-1.5 text-xs border rounded-md px-3 py-1.5 ${t.textSecondary} ${t.borderB} font-semibold uppercase tracking-wider`}>
          Target: {targetLang}
        </div>

        <button
          className={`flex items-center gap-1.5 text-xs border rounded-md px-3 py-1.5 ${t.hoverBg} ${t.textSecondary} ${t.borderB}`}
        >
          <IconAspectRatio size={15} strokeWidth={1.75} />
          9:16
          <IconChevronDown size={13} strokeWidth={1.75} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className={`p-2 rounded-md transition-colors duration-150 ${t.hoverBg} ${t.textMuted}`}
        >
          {theme === "dark" ? (
            <IconSun size={16} strokeWidth={1.75} />
          ) : (
            <IconMoon size={16} strokeWidth={1.75} />
          )}
        </button>

        {/* Project trash/reset action */}
        <button
          onClick={resetProject}
          className={`p-2 rounded-md ${t.hoverBg} ${t.textMuted}`}
          title="Reset project"
        >
          <IconTrash size={16} strokeWidth={1.75} />
        </button>

        <button
          onClick={onOpenSettings}
          className={`p-2 rounded-md ${t.hoverBg} ${t.textMuted}`}
          title="Settings"
        >
          <IconSettings size={16} strokeWidth={1.75} />
        </button>

        <button
          onClick={onOpenExport}
          className={`flex items-center gap-1.5 text-xs font-medium ${t.activeBg} ${t.activeText} hover:opacity-90 rounded-md px-3.5 py-1.5 cursor-pointer`}
        >
          <IconDownload size={15} strokeWidth={1.75} />
          Export
        </button>
      </div>
    </div>
  );
};
