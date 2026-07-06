/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Video as IconVideo,
  Type as IconTypography,
  Music as IconMusic,
  Smile as IconMoodSmile,
  ChevronDown as IconChevronDown,
  Volume2 as IconVolume2,
  Trash2 as IconTrash,
  Plus as IconPlus,
  Eye as IconEye,
  Diamond as IconKeyframe,
  VolumeX as IconMute,
  SlidersHorizontal as IconAdjust,
  GripVertical as IconGrip,
  X as IconClose,
} from "lucide-react";
import { useThemeClasses } from "../context/ThemeContext";

export interface SelectedClip {
  id: string;
  type: "video" | "audio" | "text" | "sticker";
  name: string;
}

interface RightPanelProps {
  width: number;
  clip: SelectedClip | null;
  onClose?: () => void;
  isMobile?: boolean;
}

const CLIP_TYPE_LABEL = {
  video: "Video clip",
  text: "Text clip",
  sticker: "Sticker clip",
  audio: "Audio clip",
};

export const RightPanel: React.FC<RightPanelProps> = ({ width, clip, onClose, isMobile = false }) => {
  const t = useThemeClasses();

  const [keyframed, setKeyframed] = useState<Record<string, boolean>>({
    X: false,
    Y: false,
    Scale: true,
    Rotation: false,
  });

  const [opacity, setOpacity] = useState(100);
  const [speed, setSpeed] = useState(1.0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [fontSize, setFontSize] = useState("32");
  const [textColor, setTextColor] = useState("#1a1a1a");

  const [effects, setEffects] = useState<Array<{ id: string; name: string; active: boolean }>>([
    { id: "fx1", name: "Color Adjust", active: true },
    { id: "fx2", name: "Vignette focus", active: true },
    { id: "fx3", name: "Speed ramp", active: false },
  ]);

  if (!clip) {
    return (
      <div
        className={`shrink-0 flex flex-col items-center justify-center p-6 text-center border-l ${t.borderB} ${t.panelBg} ${t.textMuted} h-full`}
        style={{ width: isMobile ? "100%" : width }}
      >
        <IconAdjust size={24} className="mb-2 animate-pulse" />
        <span className={`text-xs font-semibold block ${t.textPrimary}`}>Properties</span>
        <span className={`text-[10px] max-w-[180px] mt-1 block ${t.textMuted} leading-relaxed`}>
          Select a track item in the multi-track timeline below to configure parameters.
        </span>
      </div>
    );
  }

  const type = clip.type;
  const hasTransform = type === "video" || type === "text" || type === "sticker";
  const hasSpeed = type === "video";
  const hasFont = type === "text";
  const hasEmbeddedAudio = type === "video" || type === "audio";

  const toggleKeyframe = (label: string) => {
    setKeyframed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleAddEffect = () => {
    const newFx = {
      id: `fx-${Date.now()}`,
      name: "New AI Filter",
      active: true,
    };
    setEffects((prev) => [...prev, newFx]);
  };

  const handleToggleEffect = (id: string) => {
    setEffects((prev) =>
      prev.map((fx) => (fx.id === id ? { ...fx, active: !fx.active } : fx))
    );
  };

  const handleRemoveEffect = (id: string) => {
    setEffects((prev) => prev.filter((fx) => fx.id !== id));
  };

  return (
    <div
      className={`shrink-0 overflow-y-auto flex flex-col h-full relative border-l ${t.borderB} ${t.panelBg} ${t.textPrimary}`}
      style={{ width: isMobile ? "100%" : width }}
    >
      {/* Header */}
      <div className={`px-4 py-3 border-b ${t.borderB} flex items-center justify-between shrink-0 ${t.subtleBg}`}>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${t.textMuted}`}>
          Properties
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className={`p-1 rounded-md transition-colors cursor-pointer ${t.textMuted} hover:${t.textPrimary}`}
          >
            <IconClose size={14} />
          </button>
        )}
      </div>

      {/* Selected clip contextual chip */}
      <div className={`mx-4 mt-3 shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-xl border ${t.subtleBg} ${t.borderB}`}>
        <div className={`p-1.5 rounded-lg shadow-sm shrink-0 border ${t.borderB} ${t.accent} ${t.inputBg}`}>
          {type === "video" && <IconVideo size={13} />}
          {type === "text" && <IconTypography size={13} />}
          {type === "sticker" && <IconMoodSmile size={13} />}
          {type === "audio" && <IconMusic size={13} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] font-bold tracking-tight leading-tight uppercase ${t.textSecondary}`}>
            {CLIP_TYPE_LABEL[type]}
          </div>
          <div className={`text-[10px] truncate mt-0.5 ${t.textMuted}`}>{clip.name}</div>
        </div>
      </div>

      {/* Options Scrollable Stack */}
      <div className="flex-1 p-4 space-y-5 min-h-0 overflow-y-auto">
        {/* Transform settings */}
        {hasTransform && (
          <div className="space-y-2">
            <span className={`text-[9px] font-bold uppercase tracking-widest block ${t.textMuted}`}>Transform Layout</span>
            <div className="grid grid-cols-2 gap-2.5">
              {["X Position", "Y Position", "Scale Size", "Rotation angle"].map((label) => {
                const key = label.split(" ")[0];
                const active = keyframed[key];
                return (
                  <div key={label} className="flex flex-col gap-1">
                    <span className={`text-[9px] font-semibold uppercase tracking-wide ${t.textMuted}`}>
                      {label}
                    </span>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        className={`w-full text-[10px] border rounded-lg pl-2 pr-7 py-1.5 font-mono outline-none ${t.inputBg} ${t.borderB} ${t.textPrimary} focus:border-violet-500`}
                        defaultValue={key === "Scale" ? "100%" : "0"}
                      />
                      <button
                        onClick={() => toggleKeyframe(key)}
                        title={active ? "Keyframe set" : "Insert keyframe at playhead"}
                        className={`absolute right-1.5 p-1 rounded transition-colors ${
                          active
                            ? `${t.accent} ${t.subtleBg}`
                            : `${t.textMuted} hover:${t.textSecondary}`
                        }`}
                      >
                        <IconKeyframe
                          size={10}
                          fill={active ? "currentColor" : "none"}
                          strokeWidth={active ? 0 : 2}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Font selections for Subtitles / Text */}
        {hasFont && (
          <div className={`space-y-3 pt-3 border-t ${t.borderB}`}>
            <span className={`text-[9px] font-bold uppercase tracking-widest block ${t.textMuted}`}>Typography Style</span>

            <div className="space-y-2">
              <div className="relative">
                <select className={`w-full border ${t.borderB} ${t.inputBg} rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 outline-none cursor-pointer appearance-none ${t.textPrimary} focus:ring-violet-500/20 focus:border-violet-500`}>
                  <option className={`${t.dark ? 'bg-[#1B1712] text-[#F5F1E8]' : 'bg-white text-neutral-800'}`}>Inter — Semibold</option>
                  <option className={`${t.dark ? 'bg-[#1B1712] text-[#F5F1E8]' : 'bg-white text-neutral-800'}`}>Khmer OS Battambang</option>
                  <option className={`${t.dark ? 'bg-[#1B1712] text-[#F5F1E8]' : 'bg-white text-neutral-800'}`}>JetBrains Mono — Bold</option>
                  <option className={`${t.dark ? 'bg-[#1B1712] text-[#F5F1E8]' : 'bg-white text-neutral-800'}`}>Space Grotesk</option>
                </select>
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${t.textMuted}`}>
                  <IconChevronDown size={14} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 flex flex-col gap-1">
                  <span className={`text-[9px] font-semibold uppercase tracking-wide ${t.textMuted}`}>Font Size</span>
                  <input
                    type="number"
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className={`w-full text-xs border ${t.borderB} ${t.inputBg} rounded-lg px-2.5 py-1.5 font-mono outline-none ${t.textPrimary} focus:border-violet-500`}
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <span className={`text-[9px] font-semibold uppercase tracking-wide ${t.textMuted}`}>Text Color</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className={`w-8 h-8 rounded-lg border outline-none cursor-pointer ${t.inputBg} ${t.borderB}`}
                    />
                    <span className={`text-[10px] font-mono ${t.textMuted}`}>{textColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Opacity opacity settings */}
        {(hasTransform || type === "audio") && (
          <div className={`space-y-1.5 pt-3 border-t ${t.borderB}`}>
            <div className={`flex items-center justify-between text-[9px] font-bold uppercase tracking-widest ${t.textMuted}`}>
              <span>Layer Opacity</span>
              <span className="font-mono text-violet-500">{opacity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(parseInt(e.target.value))}
              className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-neutral-200 dark:bg-neutral-800 accent-violet-500"
            />
          </div>
        )}

        {/* Playback speed adjustments */}
        {hasSpeed && (
          <div className={`space-y-1.5 pt-3 border-t ${t.borderB}`}>
            <div className={`flex items-center justify-between text-[9px] font-bold uppercase tracking-widest ${t.textMuted}`}>
              <span>Playback Speed</span>
              <span className="font-mono text-violet-500">{speed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-neutral-200 dark:bg-neutral-800 accent-violet-500"
            />
          </div>
        )}

        {/* Sound volumes (Embedded) */}
        {hasEmbeddedAudio && (
          <div className={`space-y-2 pt-3 border-t ${t.borderB}`}>
            <span className={`text-[9px] font-bold uppercase tracking-widest block ${t.textMuted}`}>Volume Mix</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMuted((m) => !m)}
                className={`p-2 rounded-xl transition-all border ${
                  muted
                    ? "bg-red-50 text-red-500 border-red-200"
                    : `${t.inputBg} ${t.borderB} ${t.textMuted} hover:${t.textSecondary}`
                }`}
              >
                {muted ? <IconMute size={14} /> : <IconVolume2 size={14} />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                disabled={muted}
                value={muted ? 0 : volume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-full h-1 rounded-lg appearance-none cursor-pointer disabled:opacity-40 bg-neutral-200 dark:bg-neutral-800 accent-violet-500"
              />
              <span className={`text-[10px] font-mono w-8 text-right ${t.textMuted}`}>
                {muted ? 0 : volume}%
              </span>
            </div>
          </div>
        )}

        {/* Filter/FX controls */}
        <div className={`space-y-3 pt-3 border-t ${t.borderB}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[9px] font-bold uppercase tracking-widest ${t.textMuted}`}>
              Effects Stack
            </span>
            <button
              onClick={handleAddEffect}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-500 hover:text-violet-400"
            >
              <IconPlus size={11} />
              Add FX
            </button>
          </div>

          <div className="space-y-2">
            {effects.map((fx) => (
              <div
                key={fx.id}
                className={`flex items-center gap-2.5 text-xs border rounded-xl pl-2 pr-3 py-2 transition-all ${
                  fx.active
                    ? `${t.inputBg} ${t.borderB} ${t.textPrimary}`
                    : `bg-neutral-50 dark:bg-neutral-950/40 border-neutral-200 dark:border-neutral-900 ${t.textMuted} opacity-60`
                }`}
              >
                <IconGrip size={12} className={`${t.textMuted} cursor-grab shrink-0`} />
                <span className="flex-1 truncate font-semibold text-[10px]">{fx.name}</span>

                <button
                  onClick={() => handleToggleEffect(fx.id)}
                  className={`p-1 rounded transition-colors shrink-0 hover:${t.hoverBg} ${
                    fx.active ? t.textSecondary : t.textMuted
                  }`}
                  title="Toggle Effect Visibility"
                >
                  <IconEye size={12} />
                </button>

                <button
                  onClick={() => handleRemoveEffect(fx.id)}
                  className={`p-1 rounded transition-colors shrink-0 ${t.textMuted} hover:text-red-500`}
                  title="Remove Effect"
                >
                  <IconTrash size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
