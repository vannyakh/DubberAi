/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Download as IconDownload, 
  X as IconClose, 
  CheckCircle2 as IconCheck,
  Loader2 as IconSpinner
} from "lucide-react";
import { useStudio } from "../hooks/useStudio";
import { useThemeClasses } from "../context/ThemeContext";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ open, onClose }) => {
  const { handleExport, isExporting, status } = useStudio();
  const t = useThemeClasses();

  const [preset, setPreset] = useState("1080p — High");
  const [format, setFormat] = useState("MP4 (H.264)");
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState<"idle" | "rendering" | "completed">("idle");

  useEffect(() => {
    if (isExporting) {
      setExportStage("rendering");
      setExportProgress(0);
      const interval = setInterval(() => {
        setExportProgress((p) => {
          if (p >= 100) {
            clearInterval(interval);
            setExportStage("completed");
            return 100;
          }
          return p + Math.floor(Math.random() * 5) + 2;
        });
      }, 150);
      return () => clearInterval(interval);
    } else {
      setExportStage("idle");
      setExportProgress(0);
    }
  }, [isExporting]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`${t.panelBg} border ${t.borderB} rounded-2xl flex flex-col w-full max-w-md shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${t.borderB} shrink-0`}>
          <div className="flex items-center gap-2">
            <IconDownload size={15} className={t.accent} />
            <span className={`text-xs font-bold uppercase tracking-widest ${t.textPrimary}`}>Export Project Video</span>
          </div>
          <button 
            onClick={onClose} 
            disabled={isExporting}
            className={`p-1 ${t.textMuted} hover:${t.textPrimary} rounded-lg hover:${t.hoverBg} transition-colors cursor-pointer disabled:opacity-30`}
          >
            <IconClose size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {exportStage === "idle" && (
            <>
              <p className={`text-xs ${t.textSecondary} leading-relaxed`}>
                Configure your rendering settings below. The AI-dubbed voiceover will be mixed down and encoded directly into the exported video stream.
              </p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${t.textMuted} block`}>Resolution Preset</span>
                  <select 
                    value={preset} 
                    onChange={(e) => setPreset(e.target.value)}
                    className={`w-full ${t.inputBg} border ${t.borderB} rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 outline-none cursor-pointer ${t.textPrimary}`}
                  >
                    <option className={`${t.dark ? 'bg-[#1B1712] text-[#F5F1E8]' : 'bg-white text-neutral-800'}`}>1080p — High (Recommended)</option>
                    <option className={`${t.dark ? 'bg-[#1B1712] text-[#F5F1E8]' : 'bg-white text-neutral-800'}`}>720p — Mobile Standard</option>
                    <option className={`${t.dark ? 'bg-[#1B1712] text-[#F5F1E8]' : 'bg-white text-neutral-800'}`}>2160p (4K UHD) — Cinematic</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${t.textMuted} block`}>Output Format</span>
                  <select 
                    value={format} 
                    onChange={(e) => setFormat(e.target.value)}
                    className={`w-full ${t.inputBg} border ${t.borderB} rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 outline-none cursor-pointer ${t.textPrimary}`}
                  >
                    <option className={`${t.dark ? 'bg-[#1B1712] text-[#F5F1E8]' : 'bg-white text-neutral-800'}`}>MP4 (H.264)</option>
                    <option className={`${t.dark ? 'bg-[#1B1712] text-[#F5F1E8]' : 'bg-white text-neutral-800'}`}>MOV (ProRes)</option>
                    <option className={`${t.dark ? 'bg-[#1B1712] text-[#F5F1E8]' : 'bg-white text-neutral-800'}`}>MP3 (Audio Only)</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleExport}
                className={`w-full py-3 ${t.accentBg} ${t.accentInk} rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md`}
              >
                <IconDownload size={14} />
                Start Render & Download
              </button>
            </>
          )}

          {exportStage === "rendering" && (
            <div className="text-center py-6 space-y-6">
              <div className="flex justify-center relative">
                <IconSpinner className={`animate-spin ${t.accent}`} size={36} />
              </div>

              <div className="space-y-1">
                <h4 className={`text-xs font-bold uppercase tracking-widest ${t.textPrimary}`}>Encoding Video Stream</h4>
                <p className={`text-[10px] ${t.textMuted} font-mono`}>{status || "Mixing and saving..."}</p>
              </div>

              <div className="space-y-2">
                <div className={`h-1.5 w-full ${t.subtleBg} rounded-full overflow-hidden`}>
                  <div 
                    className="h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
                <div className={`flex justify-between items-center text-[10px] font-mono ${t.textMuted}`}>
                  <span>{exportProgress}%</span>
                  <span>Est: 10s remaining</span>
                </div>
              </div>
            </div>
          )}

          {exportStage === "completed" && (
            <div className="text-center py-6 space-y-5">
              <div className="flex justify-center text-emerald-500">
                <IconCheck size={44} />
              </div>

              <div className="space-y-1">
                <h4 className={`text-xs font-bold uppercase tracking-widest ${t.textPrimary}`}>Export Successful!</h4>
                <p className={`text-[10px] ${t.textMuted}`}>Your file has been processed and saved successfully.</p>
              </div>

              <button 
                onClick={onClose}
                className={`px-6 py-2 ${t.accentBg} ${t.accentInk} rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer`}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
