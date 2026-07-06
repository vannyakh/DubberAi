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
  Wand2 as IconWand,
  ArrowLeftRight as IconArrowsExchange,
  Captions as IconCaptions,
  Upload as IconUpload,
  ChevronDown as IconChevronDown,
  Volume2 as IconVolume2,
  Trash2 as IconTrash,
  Plus as IconPlus,
  Play as IconPlay,
  Pause as IconPause,
  Languages as IconTranslate,
  Mic as IconVoice,
  Check as IconCheck,
  AlertTriangle as IconWarning,
  Sparkles as IconSparkles,
  Loader2 as IconLoader,
  History as IconHistory,
  Search as IconSearch,
  Calendar as IconCalendar,
  Globe as IconGlobe,
  Clock as IconClock,
} from "lucide-react";
import { useStudio } from "../hooks/useStudio";
import { useThemeClasses } from "../context/ThemeContext";
import { VOICES, LANGUAGES } from '@video-voice-translator/utils';

const SIDEBAR_TABS = [
  { id: "media", label: "Media", icon: IconVideo },
  { id: "text", label: "Text", icon: IconTypography },
  { id: "audio", label: "Audio", icon: IconMusic },
  { id: "stickers", label: "Stickers", icon: IconMoodSmile },
  { id: "effects", label: "Effects", icon: IconWand },
  { id: "transitions", label: "Transitions", icon: IconArrowsExchange },
  { id: "dub", label: "Dub", icon: IconCaptions, ai: true },
  { id: "history", label: "History", icon: IconHistory },
];

const DUB_STAGES = [
  { id: "transcript", label: "Transcript" },
  { id: "translate", label: "Translate" },
  { id: "voices", label: "Voices" },
  { id: "timing", label: "Timing" },
];

function AiCornerDot() {
  return (
    <span
      className="absolute rounded-full flex items-center justify-center"
      style={{
        top: -2,
        right: -2,
        width: 10,
        height: 10,
        background: "linear-gradient(135deg, #d946ef, #6366f1)",
        boxShadow: "0 0 0 2px rgba(0,0,0,0.2)",
      }}
    >
      <IconSparkles size={6} strokeWidth={2.5} className="text-white" />
    </span>
  );
}

export const LeftPanel: React.FC<{ width: number }> = ({ width }) => {
  const {
    activeTab,
    setActiveTab,
    videoFile,
    resetProject,
    loadDemoVideo,
    transcriptSegments,
    translationSegments,
    currentTime,
    updateSegment,
    targetLang,
    setTargetLang,
    selectedVoice,
    setSelectedVoice,
    originalVolume,
    setOriginalVolume,
    voiceVolume,
    setVoiceVolume,
    detectedSpeakers,
    speakerVoices,
    updateSpeakerVoice,
    previewingSpeaker,
    handlePreviewVoice,
    handleProcess,
    handleTranslateOnly,
    handleSpeechOnly,
    status,
    videoRef,
    sidebarOpen,
    playingTranslationIndex,
    playTranslationSegmentSpeech,
    
    // History states
    recentProjects,
    projectId,
    loadProject,
    deleteProject,
  } = useStudio();

  const [dubStage, setDubStage] = useState<string>("transcript");
  const t = useThemeClasses();

  // History Tab Specific States and Functions
  const [historySearch, setHistorySearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [playingHistoryId, setPlayingHistoryId] = useState<string | null>(null);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const audioSourceRef = React.useRef<AudioBufferSourceNode | null>(null);

  const playHistoryAudio = async (projId: string, base64: string) => {
    if (playingHistoryId === projId) {
      stopHistoryAudio();
      return;
    }
    stopHistoryAudio();
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Int16Array(len / 2);
      for (let i = 0; i < len; i += 2) {
        bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
      }
      const float32Data = new Float32Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        float32Data[i] = bytes[i] / 32768.0;
      }
      const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setPlayingHistoryId(null);
      };
      audioSourceRef.current = source;
      setPlayingHistoryId(projId);
      source.start();
    } catch (err) {
      console.error("Failed to play history preview", err);
    }
  };

  const stopHistoryAudio = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {}
      audioSourceRef.current = null;
    }
    setPlayingHistoryId(null);
  };

  React.useEffect(() => {
    return () => {
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const filteredProjects = (recentProjects || []).filter((p) => {
    const search = historySearch.toLowerCase();
    const nameMatch = p.name.toLowerCase().includes(search);
    const langMatch = (p.targetLang || "").toLowerCase().includes(search);
    const idMatch = p.id.toLowerCase().includes(search);
    return nameMatch || langMatch || idMatch;
  });

  if (!sidebarOpen) return null;

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = "auto";
    target.style.height = target.scrollHeight + "px";
  };

  const handleAddNewTextLine = () => {
    // Add custom caption to transcript segments or translation segments
    const formattedTime = `[${Math.floor(currentTime / 60)
      .toString()
      .padStart(2, "0")}:${Math.floor(currentTime % 60)
      .toString()
      .padStart(2, "0")}]`;
    alert("Add custom text at current timestamp is supported in timeline track.");
  };

  // Check timing tolerance for Dub segments
  const getDurationStatus = (target: number, textLength: number) => {
    const estimatedSecs = Math.max(1.5, textLength * 0.15); 
    const diff = Math.abs(estimatedSecs - target) / target;
    if (diff <= 0.15) return { level: "ok", gen: estimatedSecs };
    if (diff <= 0.35) return { level: "warn", gen: estimatedSecs };
    return { level: "bad", gen: estimatedSecs };
  };

  return (
    <div className={`shrink-0 border-r ${t.borderB} ${t.panelBg} flex h-full ${t.textPrimary}`} style={{ width }}>
      {/* Icon Rail */}
      <div className={`w-16 shrink-0 border-r ${t.borderB} flex flex-col items-center py-3 gap-1 ${t.dark ? "bg-neutral-950/40" : "bg-neutral-50/80"}`}>
        {SIDEBAR_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-14 h-14 flex flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer relative ${
                active
                  ? `${t.activeBg} ${t.activeText} shadow-sm`
                  : `${t.textMuted} hover:${t.textSecondary} hover:${t.hoverBg}`
              }`}
            >
              <div className="relative">
                <Icon size={18} strokeWidth={2} />
                {tab.ai && <AiCornerDot />}
              </div>
              <span className="scale-90 origin-center">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Panel Content Panel */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${t.textMuted}`}>
            {SIDEBAR_TABS.find((tb) => tb.id === activeTab)?.label}
          </span>
          {activeTab === "media" && (
            <button
              onClick={resetProject}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400 px-2 py-1 rounded-md transition-all cursor-pointer"
            >
              <IconTrash size={12} />
              Reset
            </button>
          )}
        </div>

        {/* MEDIA TAB */}
        {activeTab === "media" && (
          <div className="space-y-4 flex-1 flex flex-col">
            <div className={`border border-dashed ${t.borderB} rounded-2xl p-6 text-center ${t.subtleBg} flex flex-col items-center justify-center gap-3`}>
              <IconUpload size={24} className={t.textMuted} />
              <div>
                <span className={`text-xs font-semibold ${t.textPrimary} block`}>Loaded Video</span>
                <span className={`text-[10px] ${t.textMuted} truncate max-w-[180px] block mt-0.5`}>
                  {videoFile?.name || "Demo project video"}
                </span>
              </div>
            </div>

            <div className="space-y-2 mt-2">
              <span className={`text-[9px] font-bold ${t.textMuted} uppercase tracking-wider block`}>Demo Stock Videos</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={loadDemoVideo}
                  className={`rounded-xl border ${t.borderB} ${t.hoverBg} transition-all overflow-hidden p-2 text-left group flex flex-col gap-1.5`}
                >
                  <div className={`aspect-video ${t.inputBg} rounded-md flex items-center justify-center ${t.textMuted} group-hover:bg-neutral-800`}>
                    <IconPlay size={16} />
                  </div>
                  <span className={`text-[10px] font-bold ${t.textPrimary} truncate block`}>Big Buck Bunny</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TEXT TAB */}
        {activeTab === "text" && (
          <div className="space-y-4">
            <span className={`text-[10px] ${t.textMuted} leading-relaxed block`}>
              Insert a customizable subtitle caption block onto the timeline at the current playhead timestamp.
            </span>
            <button
              onClick={handleAddNewTextLine}
              className={`w-full py-3 ${t.activeBg} ${t.activeText} rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm`}
            >
              <IconPlus size={14} />
              Add Text Caption
            </button>
          </div>
        )}

        {/* AUDIO TAB */}
        {activeTab === "audio" && (
          <div className="space-y-5">
            {/* Audio Mixing Slider Controls */}
            <div className={`space-y-3 ${t.subtleBg} border ${t.borderB} p-3.5 rounded-2xl`}>
              <span className={`text-[9px] font-bold ${t.textMuted} uppercase tracking-widest block mb-1`}>Mixing Hub</span>
              
              <div className="space-y-1.5">
                <div className={`flex justify-between items-center text-[10px] font-bold ${t.textSecondary} uppercase tracking-wide`}>
                  <span>Original Track</span>
                  <span className="text-violet-400 font-mono">{Math.round(originalVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={originalVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setOriginalVolume(val);
                    if (videoRef.current) videoRef.current.volume = val;
                  }}
                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <div className={`flex justify-between items-center text-[10px] font-bold ${t.textSecondary} uppercase tracking-wide`}>
                  <span>AI Voiceover</span>
                  <span className="text-violet-400 font-mono">{Math.round(voiceVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={voiceVolume}
                  onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>
            </div>

            {/* Speaker voices selector list */}
            {detectedSpeakers.length > 0 ? (
              <div className="space-y-3">
                <span className={`text-[9px] font-bold ${t.textMuted} uppercase tracking-widest block`}>Speaker Profiles</span>
                <div className="space-y-2">
                  {detectedSpeakers.map((speaker) => (
                    <div key={speaker} className={`flex flex-col gap-2 p-3 ${t.subtleBg} border ${t.borderB} rounded-xl`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${t.textPrimary} truncate max-w-[140px]`}>{speaker}</span>
                        <button
                          onClick={() => handlePreviewVoice(speaker)}
                          disabled={previewingSpeaker !== null}
                          className={`p-1.5 ${t.hoverBg} rounded-lg text-violet-400 transition-all disabled:opacity-30 cursor-pointer border ${t.borderB} shadow-sm`}
                          title="Preview voice clone"
                        >
                          {previewingSpeaker === speaker ? (
                            <IconLoader size={11} className="animate-spin" />
                          ) : (
                            <IconVolume2 size={11} />
                          )}
                        </button>
                      </div>
                      <select
                        value={speakerVoices[speaker] || "Kore"}
                        onChange={(e) => updateSpeakerVoice(speaker, e.target.value)}
                        className={`border ${t.borderB} ${t.inputBg} ${t.textSecondary} rounded-lg px-2.5 py-1.5 text-[10px] font-medium outline-none cursor-pointer w-full`}
                      >
                        {VOICES.map((v) => (
                          <option key={v.id} value={v.id} className={`${t.dark ? 'bg-neutral-900 text-neutral-200' : 'bg-white text-neutral-800'}`}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`text-center py-6 ${t.textMuted} text-xs italic`}>
                No speakers detected. Run processing first.
              </div>
            )}
          </div>
        )}

        {/* STICKERS TAB */}
        {activeTab === "stickers" && (
          <div className="grid grid-cols-4 gap-2">
            {["😊", "🔥", "👍", "❤️", "🚀", "🎉", "💡", "🎨", "🌟", "✨", "🍿", "🍕"].map((sticker, idx) => (
              <button
                key={idx}
                className={`aspect-square ${t.subtleBg} hover:bg-neutral-800 border ${t.borderB} rounded-xl flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95 cursor-pointer`}
              >
                {sticker}
              </button>
            ))}
          </div>
        )}

        {/* EFFECTS TAB */}
        {activeTab === "effects" && (
          <div className="space-y-2">
            {[
              { name: "Warm Amber", desc: "Adds cinematic warm tones" },
              { name: "Cyan Grade", desc: "High contrast teal and orange" },
              { name: "Noir Film", desc: "Classic black and white style" },
              { name: "Vignette Glow", desc: "Darkened border focus vignette" },
            ].map((fx, idx) => (
              <button
                key={idx}
                className={`w-full p-3 text-left border ${t.borderB} ${t.hoverBg} rounded-xl ${t.subtleBg} transition-all flex items-center justify-between group cursor-pointer`}
              >
                <div>
                  <span className={`text-xs font-bold ${t.textPrimary} block`}>{fx.name}</span>
                  <span className={`text-[10px] ${t.textMuted} block mt-0.5`}>{fx.desc}</span>
                </div>
                <IconWand size={14} className={t.textMuted} />
              </button>
            ))}
          </div>
        )}

        {/* TRANSITIONS TAB */}
        {activeTab === "transitions" && (
          <div className="space-y-2">
            {["Fade Cross Dissolve", "Left-to-Right Wipe", "Scale Focus Zoom", "Smooth Slide Blur"].map((tr, idx) => (
              <button
                key={idx}
                className={`w-full p-3 text-left border ${t.borderB} ${t.hoverBg} rounded-xl ${t.subtleBg} transition-all flex items-center justify-between group cursor-pointer`}
              >
                <span className={`text-xs font-bold ${t.textPrimary}`}>{tr}</span>
                <IconArrowsExchange size={14} className={t.textMuted} />
              </button>
            ))}
          </div>
        )}

        {/* DUB PIPELINE TAB */}
        {activeTab === "dub" && (
          <div className="flex flex-col h-full min-h-0">
            {/* Dub Sub-Tabs */}
            <div className={`flex items-center gap-1 mb-3 ${t.subtleBg} border ${t.borderB} rounded-xl p-1 shrink-0`}>
              {DUB_STAGES.map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => setDubStage(stage.id)}
                  className={`flex-1 text-[10px] font-bold uppercase tracking-wider rounded-lg py-1.5 cursor-pointer transition-all ${
                    dubStage === stage.id
                      ? `${t.activeBg} ${t.activeText} shadow-sm`
                      : `${t.textMuted} hover:${t.textSecondary} hover:${t.hoverBg}`
                  }`}
                >
                  {stage.label}
                </button>
              ))}
            </div>

            {/* Stage content */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pb-2">
              {dubStage === "transcript" && (
                <div className="space-y-3 flex flex-col h-full">
                  <div className={`flex items-center justify-between text-[10px] font-bold ${t.textMuted} uppercase tracking-widest px-1`}>
                    <span>Source Language</span>
                    <span className="text-emerald-500">Auto-Detected</span>
                  </div>

                  {transcriptSegments.length > 0 ? (
                    <div className="space-y-2.5">
                      {transcriptSegments.map((seg, i) => (
                        <div
                          key={i}
                          className={`border ${t.borderB} rounded-xl p-3 ${t.subtleBg} hover:${t.hoverBg} transition-all`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-bold ${t.textMuted} uppercase tracking-widest font-mono`}>
                              {seg.speaker} • {Math.floor(seg.time / 60)}:
                              {Math.floor(seg.time % 60).toString().padStart(2, "0")}
                            </span>
                            <button
                              onClick={() => {
                                if (videoRef.current) {
                                  videoRef.current.currentTime = seg.time;
                                }
                              }}
                              className="text-[9px] font-mono text-violet-400 font-bold hover:underline"
                            >
                              Go to
                            </button>
                          </div>
                          <textarea
                            value={seg.text}
                            onChange={(e) => updateSegment(i, e.target.value, "transcript")}
                            onInput={handleTextareaInput}
                            rows={1}
                            className={`w-full text-xs ${t.textPrimary} leading-relaxed border-none p-0 bg-transparent focus:ring-0 resize-none outline-none font-medium`}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`flex-1 flex flex-col items-center justify-center text-center py-12 ${t.textMuted} gap-3 italic text-xs`}>
                      <IconCaptions size={28} className="opacity-40 animate-pulse" />
                      <span>Transcripts will appear here after video processing.</span>
                    </div>
                  )}
                  {transcriptSegments.length > 0 && (
                    <button
                      onClick={handleProcess}
                      disabled={status !== "idle"}
                      className={`w-full mt-2 py-2.5 ${t.subtleBg} hover:${t.hoverBg} disabled:opacity-50 ${t.textSecondary} rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer border ${t.borderB}`}
                    >
                      {status === "idle" ? <IconSparkles size={12} /> : <IconLoader size={12} className="animate-spin" />}
                      Re-run Transcription
                    </button>
                  )}
                </div>
              )}

              {dubStage === "translate" && (
                <div className="space-y-3 flex flex-col h-full">
                  <div className="space-y-1.5 px-1">
                    <span className={`text-[9px] font-bold ${t.textMuted} uppercase tracking-widest block`}>Target Translation</span>
                    <select
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      className={`w-full ${t.inputBg} border ${t.borderB} rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-violet-500/20 ${t.textSecondary} outline-none cursor-pointer`}
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code} className={`${t.dark ? 'bg-neutral-900 text-neutral-250' : 'bg-white text-neutral-800'}`}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {translationSegments.length > 0 ? (
                    <div className="space-y-2.5">
                      {translationSegments.map((seg, i) => (
                        <div
                          key={i}
                          className={`border ${t.borderB} rounded-xl p-3 ${t.subtleBg} hover:${t.hoverBg} transition-all`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-bold ${t.textMuted} uppercase tracking-widest font-mono`}>
                              {seg.speaker} • {Math.floor(seg.time / 60)}:
                              {Math.floor(seg.time % 60).toString().padStart(2, "0")}
                            </span>
                            <button
                              onClick={() => playTranslationSegmentSpeech(i)}
                              className={`p-1 px-1.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                                playingTranslationIndex === i
                                  ? "bg-violet-600/20 border-violet-500/50 text-violet-400"
                                  : `${t.dark ? 'bg-neutral-950' : 'bg-white'} ${t.borderB} ${t.textMuted} hover:${t.textSecondary}`
                              }`}
                              title={playingTranslationIndex === i ? "Stop playing" : "Listen to synthesized speech"}
                            >
                              {playingTranslationIndex === i ? (
                                <>
                                  <span className="flex h-1.5 w-1.5 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-500"></span>
                                  </span>
                                  <span className="text-[9px] font-bold uppercase tracking-wider">Playing</span>
                                </>
                              ) : (
                                <>
                                  <IconVolume2 size={11} />
                                  <span className="text-[9px] font-bold uppercase tracking-wider">Listen</span>
                                </>
                              )}
                            </button>
                          </div>
                          <textarea
                            value={seg.text}
                            onChange={(e) => updateSegment(i, e.target.value, "translation")}
                            onInput={handleTextareaInput}
                            rows={1}
                            className={`w-full text-xs ${t.textPrimary} leading-relaxed border-none p-0 bg-transparent focus:ring-0 resize-none outline-none font-bold text-violet-500`}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`flex-1 flex flex-col items-center justify-center text-center py-12 ${t.textMuted} gap-3 italic text-xs`}>
                      <IconTranslate size={28} className="opacity-40" />
                      <span>Translations will be generated when processed.</span>
                    </div>
                  )}

                  {transcriptSegments.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleTranslateOnly}
                        disabled={status !== "idle"}
                        className={`flex-1 py-2.5 ${t.subtleBg} hover:${t.hoverBg} ${t.textSecondary} rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all text-center border ${t.borderB} cursor-pointer`}
                      >
                        Re-Translate
                      </button>
                      <button
                        onClick={handleSpeechOnly}
                        disabled={status !== "idle" || translationSegments.length === 0}
                        className={`flex-1 py-2.5 ${t.activeBg} hover:opacity-95 ${t.activeText} rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all text-center cursor-pointer`}
                      >
                        Regen Voice
                      </button>
                    </div>
                  )}
                </div>
              )}

              {dubStage === "voices" && (
                <div className="space-y-3">
                  <div className="space-y-1 px-1">
                    <span className={`text-[9px] font-bold ${t.textMuted} uppercase tracking-widest block`}>Global Voice Narrator</span>
                    <select
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      className={`w-full ${t.inputBg} border ${t.borderB} rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-violet-500/20 ${t.textSecondary} outline-none cursor-pointer`}
                    >
                      {VOICES.map((v) => (
                        <option key={v.id} value={v.id} className={`${t.dark ? 'bg-neutral-900 text-neutral-250' : 'bg-white text-neutral-800'}`}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {detectedSpeakers.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <span className={`text-[9px] font-bold ${t.textMuted} uppercase tracking-widest block px-1`}>Speaker Dub Assignments</span>
                      {detectedSpeakers.map((s) => (
                        <div key={s} className={`border ${t.borderB} rounded-xl p-3 ${t.subtleBg} space-y-2`}>
                          <span className={`text-xs font-bold ${t.textPrimary}`}>{s}</span>
                          <select
                            value={speakerVoices[s] || "Kore"}
                            onChange={(e) => updateSpeakerVoice(s, e.target.value)}
                            className={`border ${t.borderB} ${t.inputBg} ${t.textSecondary} rounded-lg px-2 py-1.5 text-xs font-semibold outline-none cursor-pointer w-full`}
                          >
                            {VOICES.map((v) => (
                              <option key={v.id} value={v.id} className={`${t.dark ? 'bg-neutral-900 text-neutral-250' : 'bg-white text-neutral-800'}`}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {dubStage === "timing" && (
                <div className="space-y-3 flex flex-col h-full">
                  <div className={`flex items-center justify-between px-1 text-[10px] font-bold ${t.textMuted} uppercase tracking-widest`}>
                    <span>Clip Segments</span>
                    <span>Tolerance 15%</span>
                  </div>

                  {translationSegments.length > 0 ? (
                    <div className="space-y-2">
                      {translationSegments.map((seg, i) => {
                        const targetTime = 4.0; // Estimate 4 seconds scene segment
                        const { level, gen } = getDurationStatus(targetTime, seg.text.length);
                        return (
                          <div
                            key={i}
                            className={`flex items-center justify-between border ${t.borderB} rounded-xl p-3 ${t.subtleBg} hover:${t.hoverBg} transition-all`}
                          >
                            <span className={`text-xs font-bold ${t.textPrimary} truncate max-w-[150px]`}>
                              {seg.text}
                            </span>
                            <div
                              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${
                                level === "ok"
                                  ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/50"
                                  : level === "warn"
                                  ? "bg-amber-950/40 text-amber-400 border border-amber-900/50"
                                  : "bg-rose-950/40 text-rose-450 border border-rose-900/50"
                              }`}
                            >
                              {level === "ok" ? (
                                <IconCheck size={10} />
                              ) : (
                                <IconWarning size={10} />
                              )}
                              <span>{gen.toFixed(1)}s / {targetTime.toFixed(1)}s</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={`flex-1 flex flex-col items-center justify-center text-center py-12 ${t.textMuted} gap-3 italic text-xs`}>
                      <IconWarning size={28} className="opacity-40" />
                      <span>Process video to analyze audio timing and tolerance alignment.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            {/* Search filter bar */}
            <div className="relative shrink-0">
              <input
                type="text"
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className={`w-full text-xs pl-8 pr-3 py-2 border ${t.borderB} ${t.inputBg} rounded-xl outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 ${t.textPrimary}`}
              />
              <IconSearch size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
            </div>

            {/* List of projects */}
            <div className="flex-1 overflow-y-auto space-y-2.5 min-h-0 pr-1">
              {filteredProjects.length === 0 ? (
                <div className={`flex flex-col items-center justify-center text-center py-16 ${t.textMuted} gap-3 italic text-xs h-full`}>
                  <IconHistory size={32} className="opacity-40" />
                  <span>
                    {historySearch ? "No matches found in history." : "No previously translated clips yet."}
                  </span>
                </div>
              ) : (
                filteredProjects.map((p) => {
                  const isActive = projectId === p.id;
                  const hasAudio = !!p.audioBase64;
                  const isAudioPlayingThis = playingHistoryId === p.id;
                  const isConfirmingDelete = confirmDeleteId === p.id;

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        stopHistoryAudio();
                        loadProject(p.id);
                      }}
                      className={`group border rounded-xl p-3.5 ${t.subtleBg} hover:${t.hoverBg} transition-all cursor-pointer flex flex-col gap-2.5 relative select-none ${
                        isActive ? "border-violet-500/50 ring-2 ring-violet-500/10 shadow-md" : `border-${t.borderB}`
                      }`}
                    >
                      {/* Project Header details */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className={`text-xs font-bold truncate ${t.textPrimary} group-hover:text-violet-400 transition-colors`}>
                            {p.name}
                          </h4>
                          <span className={`text-[9px] font-mono ${t.textMuted} block mt-0.5 truncate`}>
                            {p.id}
                          </span>
                        </div>
                        
                        {/* Status badges or Active mark */}
                        {isActive && (
                          <span className="text-[8.5px] font-bold uppercase font-mono bg-violet-500/10 border border-violet-500/30 text-violet-400 px-2 py-0.5 rounded-full shrink-0">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Project Metadata details row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 border-t border-neutral-900/10 dark:border-neutral-50/5">
                        <div className={`flex items-center gap-1 text-[9.5px] ${t.textMuted}`}>
                          <IconGlobe size={11} className="shrink-0" />
                          <span className="font-semibold">{p.targetLang || "Khmer"}</span>
                        </div>
                        <div className={`flex items-center gap-1 text-[9.5px] ${t.textMuted}`}>
                          <IconCalendar size={11} className="shrink-0" />
                          <span>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "Unknown"}</span>
                        </div>
                      </div>

                      {/* Custom Replay and Actions Bar */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5">
                          {/* Instant Audio Replay Button */}
                          {hasAudio ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                playHistoryAudio(p.id, p.audioBase64!);
                              }}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                                isAudioPlayingThis
                                  ? "bg-violet-600/20 border-violet-500 text-violet-400 shadow-sm"
                                  : `${t.inputBg} ${t.borderB} ${t.textSecondary} hover:${t.textPrimary} hover:border-violet-500/40`
                              }`}
                              title={isAudioPlayingThis ? "Pause Preview" : "Play Translated Speech Preview"}
                            >
                              {isAudioPlayingThis ? (
                                <>
                                  <IconPause size={10} strokeWidth={2.5} />
                                  <span>Playing</span>
                                </>
                              ) : (
                                <>
                                  <IconPlay size={10} fill="currentColor" />
                                  <span>Preview Audio</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className={`text-[9.5px] italic ${t.textMuted}`}>
                              No generated speech
                            </span>
                          )}
                        </div>

                        {/* Delete past project button */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  deleteProject(p.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-0.5 bg-red-600 text-white font-bold text-[9px] uppercase rounded hover:bg-red-500 cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className={`px-2 py-0.5 ${t.subtleBg} ${t.textSecondary} font-bold text-[9px] uppercase rounded hover:${t.hoverBg} border ${t.borderB} cursor-pointer`}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(p.id)}
                              className={`p-1.5 rounded-lg border ${t.borderB} ${t.textMuted} hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer`}
                              title="Delete from History"
                            >
                              <IconTrash size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
