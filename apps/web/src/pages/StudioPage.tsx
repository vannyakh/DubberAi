/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { StudioHeader } from "../components/StudioHeader";
import { LeftPanel } from "../components/LeftPanel";
import { CenterStage } from "../components/CenterStage";
import { RightPanel, SelectedClip } from "../components/RightPanel";
import { TimelineTrack } from "../components/TimelineTrack";
import { ExportModal } from "../components/ExportModal";
import { useStudio } from "../hooks/useStudio";
import { useThemeClasses } from "../context/ThemeContext";
import {
  Settings as IconSettings,
  X as IconClose,
  Sparkles as IconSparkles,
  Loader2 as IconSpinner,
  KeyRound as IconKey,
  EyeOff as IconEyeOff,
  Eye as IconEye,
  ExternalLink as IconExternal,
  Cpu as IconModel,
  Plus as IconPlus,
  Play as IconPlayerPlay,
  Pause as IconPlayerPause,
  Scissors as IconScissors,
  Music as IconMusic,
  Type as IconTypography,
  Smile as IconMoodSmile,
  ArrowLeftRight as IconArrowsExchange,
  Wand2 as IconWand,
} from "lucide-react";

const AI_PROVIDERS = [
  { id: "openai", name: "OpenAI", placeholder: "sk-...", note: "Whisper transcription, GPT models" },
  { id: "anthropic", name: "Anthropic", placeholder: "sk-ant-...", note: "Claude models for translation" },
  { id: "elevenlabs", name: "ElevenLabs", placeholder: "el-...", note: "TTS voice cloning" },
  { id: "fishaudio", name: "Fish Audio", placeholder: "fa-...", note: "TTS voice cloning" },
  { id: "deepgram", name: "Deepgram", placeholder: "dg-...", note: "Transcript API" },
];

const AI_MODEL_STAGES = [
  { id: "transcript", label: "Transcript", options: ["WhisperX (local)", "Deepgram (API)", "AssemblyAI (API)"] },
  { id: "translate", label: "Translation", options: ["Claude Sonnet", "NLLB-200 (local)", "DeepL (API)"] },
  { id: "tts", label: "Voice / TTS", options: ["Fish Audio S2", "XTTS-v2 (local)", "IndexTTS-2", "ElevenLabs"] },
];

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="rounded-full shrink-0 cursor-pointer"
      style={{
        width: 30,
        height: 17,
        background: checked && !disabled ? "#7030e0" : "#444446",
        position: "relative",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.15s",
      }}
    >
      <div
        className="rounded-full bg-white"
        style={{
          width: 13,
          height: 13,
          position: "absolute",
          top: 2,
          left: checked && !disabled ? 15 : 2,
          transition: "left 0.15s",
          boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
        }}
      />
    </button>
  );
}

let keyIdCounter = 0;
function nextKeyId() {
  keyIdCounter += 1;
  return `key_${keyIdCounter}`;
}

function ApiKeyRow({ provider }: { provider: typeof AI_PROVIDERS[0] }) {
  const t = useThemeClasses();
  const [keys, setKeys] = useState([{ id: nextKeyId(), value: "", visible: false }]);
  const [rotate, setRotate] = useState(false);

  const connectedCount = keys.filter((k) => k.value.trim().length > 0).length;
  const connected = connectedCount > 0;

  const updateKey = (id: string, patch: any) => {
    setKeys((ks) => ks.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  };
  const addKey = () => setKeys((ks) => [...ks, { id: nextKeyId(), value: "", visible: false }]);
  const removeKey = (id: string) => setKeys((ks) => (ks.length > 1 ? ks.filter((k) => k.id !== id) : ks));

  return (
    <div className={`border ${t.borderB} rounded-xl p-4 ${t.subtleBg} space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="rounded-full shrink-0"
            style={{ width: 8, height: 8, background: connected ? "#10b981" : "#4b5563" }}
          />
          <span className={`text-xs font-bold ${t.textPrimary} truncate uppercase tracking-wider`}>{provider.name}</span>
        </div>
        <span className={`text-[10px] font-bold font-mono ${t.textMuted} uppercase tracking-widest ${t.inputBg} px-2 py-0.5 rounded-md border ${t.borderB}`}>
          {connectedCount > 0 ? `${connectedCount} KEY${connectedCount > 1 ? "s" : ""} SET` : "NOT SET"}
        </span>
      </div>
      <p className={`text-[10px] ${t.textMuted} leading-relaxed`}>{provider.note}</p>

      <div className="space-y-2">
        {keys.map((k, i) => (
          <div key={k.id} className="flex items-center gap-2">
            <span className={`text-[10px] font-mono ${t.textMuted} shrink-0`} style={{ width: 14 }}>
              {i + 1}
            </span>
            <div className="relative flex-1">
              <input
                type={k.visible ? "text" : "password"}
                value={k.value}
                onChange={(e) => updateKey(k.id, { value: e.target.value })}
                placeholder={provider.placeholder}
                className={`w-full text-xs border ${t.borderB} ${t.inputBg} rounded-lg px-2.5 py-1.5 ${t.textPrimary} focus:border-violet-500 outline-none`}
                style={{ paddingRight: 32 }}
              />
              <button
                onClick={() => updateKey(k.id, { visible: !k.visible })}
                className={`absolute ${t.textMuted} hover:${t.textSecondary} right-2 top-1/2 -translate-y-1/2 cursor-pointer`}
              >
                {k.visible ? <IconEyeOff size={13} strokeWidth={1.75} /> : <IconEye size={13} strokeWidth={1.75} />}
              </button>
            </div>
            <button
              onClick={() => removeKey(k.id)}
              disabled={keys.length === 1}
              className={`${t.textMuted} hover:text-red-500 shrink-0 disabled:opacity-40 cursor-pointer`}
            >
              <IconClose size={13} strokeWidth={1.75} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={addKey}
          className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${t.textMuted} hover:text-violet-500 cursor-pointer transition-colors`}
        >
          <IconPlus size={11} strokeWidth={2.5} />
          Add key
        </button>
        {keys.length > 1 && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${t.textMuted}`}>Rotate automatically</span>
            <ToggleSwitch checked={rotate} onChange={setRotate} />
          </label>
        )}
      </div>
    </div>
  );
}

function ApiKeysTab() {
  const t = useThemeClasses();
  return (
    <div className="space-y-3">
      {AI_PROVIDERS.map((p) => (
        <ApiKeyRow key={p.id} provider={p} />
      ))}
      <button className={`w-full flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${t.textMuted} hover:${t.textPrimary} py-1 cursor-pointer`}>
        <IconExternal size={11} strokeWidth={2.5} />
        Where do I find my API keys?
      </button>
    </div>
  );
}

function AiModelsTab() {
  const t = useThemeClasses();
  return (
    <div className="space-y-4">
      {AI_MODEL_STAGES.map((stage) => (
        <div key={stage.id} className="space-y-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${t.textMuted} block px-1`}>{stage.label}</span>
          <div className="grid grid-cols-1 gap-2">
            {stage.options.map((opt, i) => (
              <label
                key={opt}
                className={`flex items-center gap-2.5 text-xs ${t.textSecondary} border ${t.borderB} ${t.subtleBg} rounded-xl px-3.5 py-2.5 cursor-pointer hover:border-neutral-700 hover:${t.hoverBg} transition-all`}
              >
                <input type="radio" name={stage.id} defaultChecked={i === 0} className="accent-violet-500" />
                <span className="font-semibold">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

function SettingsModal({ open, onClose }: SettingsModalProps) {
  const t = useThemeClasses();
  const [tab, setTab] = useState("keys");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${t.panelBg} border ${t.borderB} rounded-2xl flex flex-col w-full max-w-md max-h-[80vh] shadow-2xl overflow-hidden`}
      >
        <div className={`flex items-center justify-between px-4 py-3.5 border-b ${t.borderB} shrink-0`}>
          <div className="flex items-center gap-2">
            <IconSettings size={15} className={t.accent} />
            <span className={`text-xs font-bold uppercase tracking-widest ${t.textPrimary}`}>System Settings</span>
          </div>
          <button onClick={onClose} className={`p-1 ${t.textMuted} hover:${t.textPrimary} rounded-lg hover:${t.hoverBg} transition-colors cursor-pointer`}>
            <IconClose size={15} />
          </button>
        </div>

        <div className="px-4 pt-3 shrink-0">
          <div className={`flex items-center gap-1 ${t.subtleBg} border ${t.borderB} rounded-xl p-1`}>
            {[
              { id: "keys", label: "API Keys", icon: IconKey },
              { id: "models", label: "AI Models", icon: IconModel },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setTab(st.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg py-1.5 transition-all cursor-pointer ${
                  tab === st.id ? `${t.accentBg} ${t.accentInk} shadow-sm` : `${t.textMuted} hover:${t.textPrimary}`
                }`}
              >
                <st.icon size={12} />
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {tab === "keys" ? <ApiKeysTab /> : <AiModelsTab />}
        </div>
      </div>
    </div>
  );
}

function ProcessingOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { status, errorMessage } = useStudio();
  const t = useThemeClasses();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + Math.floor(Math.random() * 8) + 2;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center p-6 z-50 animate-in fade-in duration-300">
      <div className={`${t.panelBg} border ${t.borderB} rounded-3xl p-6 w-full max-w-sm text-center space-y-6 shadow-2xl`}>
        <div className="flex justify-center relative">
          <div className="w-16 h-16 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
          <IconSparkles className="absolute inset-0 m-auto text-violet-500 animate-pulse" size={24} />
        </div>

        <div className="space-y-1">
          <h3 className={`text-sm font-bold ${t.textPrimary} uppercase tracking-widest`}>AI Dubbing Pipeline</h3>
          <p className={`text-xs ${t.textMuted} font-mono`}>
            {status === "transcribing" && "Step 1/3: Transcribing original voice..."}
            {status === "translating" && "Step 2/3: Generating smart translation..."}
            {status === "speaking" && "Step 3/3: Synthesizing customized speech..."}
            {status === "analyzing" && "Analyzing cinematic highlights..."}
            {status === "idle" && "Compiling and mixing audio tracks..."}
            {status === "error" && "Pipeline encountered an error"}
          </p>
        </div>

        <div className="space-y-2">
          <div className={`h-1.5 w-full ${t.subtleBg} rounded-full overflow-hidden`}>
            <div 
              className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className={`flex justify-between items-center text-[10px] font-mono ${t.textMuted}`}>
            <span>{progress}%</span>
            <span>Est: 15s remaining</span>
          </div>
        </div>

        {errorMessage && (
          <p className="text-xs text-red-500 font-semibold bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 px-3 py-1.5 rounded-lg">
            Error: {errorMessage}
          </p>
        )}

        <div className="flex justify-center gap-2 pt-2">
          <button 
            onClick={onClose}
            className={`px-4 py-1.5 ${t.subtleBg} hover:${t.hoverBg} ${t.textSecondary} rounded-xl text-xs font-bold transition-all cursor-pointer`}
          >
            Cancel Pipeline
          </button>
        </div>
      </div>
    </div>
  );
}

export const StudioPage: React.FC = () => {
  const t = useThemeClasses();
  const {
    sidebarOpen,
    setSidebarOpen,
    editorOpen,
    setEditorOpen,
    status,
    videoUrl,
  } = useStudio();

  // Selected Clip Contextual State
  const [selectedClip, setSelectedClip] = useState<SelectedClip | null>(null);

  // Modals visibility toggles
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [pipelineOpen, setPipelineOpen] = useState(false);

  // Desktop panels drag dimensions
  const [leftWidth, setLeftWidth] = useState(300);
  const [rightWidth, setRightWidth] = useState(300);
  const [timelineHeight, setTimelineHeight] = useState(176);

  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);

  // Sync pipeline modal status trigger
  useEffect(() => {
    if (status !== "idle" && status !== "error") {
      setPipelineOpen(true);
    }
  }, [status]);

  // Handle panel resizing moves
  useEffect(() => {
    if (!isResizingLeft && !isResizingRight && !isResizingTimeline) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.max(240, Math.min(600, e.clientX));
        setLeftWidth(newWidth);
      } else if (isResizingRight) {
        const newWidth = Math.max(240, Math.min(600, window.innerWidth - e.clientX));
        setRightWidth(newWidth);
      } else if (isResizingTimeline) {
        const newHeight = Math.max(120, Math.min(500, window.innerHeight - e.clientY));
        setTimelineHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
      setIsResizingTimeline(false);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight, isResizingTimeline]);

  // Is Mobile Responsive Check
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  if (isMobile) {
    // Render high-fidelity Mobile-specific view for mobile devices
    return (
      <div className={`flex flex-col h-screen ${t.pageBg} text-neutral-200 overflow-hidden select-none font-sans`}>
        {/* Mobile Header with Theme Toggle */}
        <div className={`h-14 shrink-0 border-b ${t.borderB} ${t.panelBg} flex items-center justify-between px-4 z-20`}>
          <span className={`text-sm font-semibold tracking-tight ${t.textPrimary}`}>Vokop Translate Mobile</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className={`p-2 rounded-md ${t.hoverBg} ${t.textMuted}`}
              title="Settings"
            >
              <IconSettings size={16} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setExportOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-neutral-900 rounded-md px-3 py-1.5"
            >
              Export
            </button>
          </div>
        </div>

        {/* Primary Stage Panel */}
        <div className="flex-1 min-h-0 flex flex-col relative">
          <CenterStage />
        </div>

        {/* Split Multi-track timeline track */}
        <div className="shrink-0">
          <TimelineTrack
            selectedClip={selectedClip}
            onSelectClip={setSelectedClip}
            height={160}
          />
        </div>

        {/* Global Overlays */}
        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
        <ProcessingOverlay open={pipelineOpen} onClose={() => setPipelineOpen(false)} />
      </div>
    );
  }

  // DESKTOP LAYOUT RENDER (CAPCUT STYLE GRID)
  return (
    <div className={`flex flex-col h-screen ${t.pageBg} ${t.textPrimary} overflow-hidden font-sans select-none`}>
      {/* Top Header */}
      <StudioHeader 
        onOpenSettings={() => setSettingsOpen(true)} 
        onOpenExport={() => setExportOpen(true)} 
      />

      {/* Workspace frame row */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Left Drawer tab panels */}
        <LeftPanel width={leftWidth} />

        {/* Left Drag Resize Handle */}
        {sidebarOpen && (
          <div
            onMouseDown={() => setIsResizingLeft(true)}
            className={`w-1 cursor-col-resize hover:bg-violet-500 bg-neutral-200 dark:bg-neutral-800 hover:w-1.5 transition-all z-30 shrink-0 relative flex items-center justify-center group ${
              isResizingLeft ? "bg-violet-600 w-1.5" : ""
            }`}
            title="Drag to resize Left Panel"
          >
            <div className="absolute w-[2px] h-10 bg-neutral-400 dark:bg-neutral-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {/* Center stage video preview and timeline */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          <div className="flex-1 min-h-0 relative">
            <CenterStage />
          </div>

          {/* Timeline Drag Resize Handle */}
          <div
            onMouseDown={() => setIsResizingTimeline(true)}
            className={`h-1 cursor-row-resize hover:bg-violet-500 bg-neutral-200 dark:bg-neutral-800 hover:h-1.5 transition-all z-30 shrink-0 relative flex items-center justify-center group ${
              isResizingTimeline ? "bg-violet-600 h-1.5" : ""
            }`}
            title="Drag to resize Timeline"
          >
            <div className="absolute h-[2px] w-16 bg-neutral-400 dark:bg-neutral-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Multi-track Timeline Panel */}
          <TimelineTrack
            selectedClip={selectedClip}
            onSelectClip={setSelectedClip}
            height={timelineHeight}
          />
        </div>

        {/* Right Drag Resize Handle */}
        {editorOpen && (
          <div
            onMouseDown={() => setIsResizingRight(true)}
            className={`w-1 cursor-col-resize hover:bg-violet-500 bg-neutral-200 dark:bg-neutral-800 hover:w-1.5 transition-all z-30 shrink-0 relative flex items-center justify-center group ${
              isResizingRight ? "bg-violet-600 w-1.5" : ""
            }`}
            title="Drag to resize Properties"
          >
            <div className="absolute w-[2px] h-10 bg-neutral-400 dark:bg-neutral-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {/* Right side parameters properties drawer */}
        {editorOpen && (
          <RightPanel
            width={rightWidth}
            clip={selectedClip}
            onClose={() => setEditorOpen(false)}
          />
        )}
      </div>

      {/* Global Modals & Overlays */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
      <ProcessingOverlay open={pipelineOpen} onClose={() => setPipelineOpen(false)} />
    </div>
  );
};
