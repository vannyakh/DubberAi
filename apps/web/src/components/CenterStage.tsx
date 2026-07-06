/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import {
  Play as IconPlayerPlay,
  Pause as IconPlayerPause,
  SkipBack as IconPlayerSkipBack,
  SkipForward as IconPlayerSkipForward,
  Volume2 as IconVolume2,
  VolumeX as IconMute,
  Repeat as IconLoop,
  Rewind as IconFrameBack,
  FastForward as IconFrameForward,
  Maximize as IconFullscreen,
  SlidersHorizontal as IconAdjust,
  ZoomIn as IconZoomIn,
  ZoomOut as IconZoomOut,
  Maximize2 as IconZoomReset,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import { useStudio } from "../hooks/useStudio";
import { useThemeClasses } from "../context/ThemeContext";

export const CenterStage: React.FC = () => {
  const {
    videoUrl,
    videoFile,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    activeSegmentIndex,
    translationSegments,
    transcriptSegments,
    status,
    sidebarOpen,
    setSidebarOpen,
    editorOpen,
    setEditorOpen,
    videoRef,
    safePlayVideo,
    safePauseVideo,
  } = useStudio();

  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [speed, setSpeed] = useState("1x");
  const [zoom, setZoom] = useState(1);

  const t = useThemeClasses();

  const speedOptions = ["0.5x", "1x", "1.5x", "2x"];
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const activeSegment = translationSegments[activeSegmentIndex] || transcriptSegments[activeSegmentIndex];

  // Monitor real video element play state changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [videoUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      safePlayVideo();
    } else {
      safePauseVideo();
    }
  };

  const changeSpeed = (label: string) => {
    setSpeed(label);
    setSpeedOpen(false);
    if (videoRef.current) {
      videoRef.current.playbackRate = parseFloat(label);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = pct * duration;
  };

  const zoomBy = (delta: number) => {
    setZoom((z) => Math.min(3, Math.max(0.5, z + delta)));
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className={`flex-1 flex flex-col ${t.pageBg} relative min-h-0 min-w-0 h-full`}>
      {/* Sidebar Collapse Toggle Buttons */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className={`absolute top-4 left-4 z-30 p-2.5 ${t.panelBg} border ${t.borderB} rounded-xl ${t.textMuted} hover:${t.textPrimary} hover:${t.hoverBg} transition-all shadow-md cursor-pointer`}
          title="Show Settings"
        >
          <PanelLeft size={16} />
        </button>
      )}

      {!editorOpen && (
        <button
          onClick={() => setEditorOpen(true)}
          className={`absolute top-4 right-4 z-30 p-2.5 ${t.panelBg} border ${t.borderB} rounded-xl ${t.textMuted} hover:${t.textPrimary} hover:${t.hoverBg} transition-all shadow-md cursor-pointer`}
          title="Show Properties"
        >
          <PanelRight size={16} />
        </button>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 flex items-center justify-center p-4 relative min-h-0 select-none">
        <div
          className="relative transition-transform duration-150"
          style={{ transform: `scale(${zoom})` }}
        >
          <div
            className={`rounded-2xl border ${t.borderB} flex items-center justify-center overflow-hidden relative shadow-2xl bg-black`}
            style={{
              width: "min(360px, 80vw)", // Set to mobile portrait (9:16 aspect ratio look) by default
              aspectRatio: "9 / 16",
              maxHeight: "65vh",
            }}
          >
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                muted={muted}
                loop={loop}
                playsInline
                className="w-full h-full object-contain cursor-pointer"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onClick={togglePlay}
              />
            ) : (
              <div className="text-neutral-500 text-xs italic">No video project loaded</div>
            )}

            {/* Subtitle Caption Overlay */}
            {activeSegmentIndex !== -1 && activeSegment && (
              <div className="absolute bottom-16 left-0 right-0 px-4 pointer-events-none flex justify-center z-10">
                <motion.div
                  key={activeSegmentIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-neutral-950/95 text-white px-4 py-2 rounded-lg text-center text-xs font-semibold shadow-xl tracking-tight max-w-[90%] leading-relaxed border border-neutral-800"
                >
                  {activeSegment.text}
                </motion.div>
              </div>
            )}

            {/* Processing State Loaders */}
            {status !== "idle" && status !== "error" && (
              <div className="absolute inset-0 bg-neutral-955/60 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-20">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-white font-bold uppercase tracking-widest text-[9px] animate-pulse">
                    {status}...
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Zoom Control Pill (Floating bottom-left) */}
        <div className={`absolute flex items-center rounded-full ${t.panelBg} border ${t.borderB} p-0.5 shadow-md bottom-4 left-4 z-20`}>
          <button
            onClick={() => zoomBy(-0.1)}
            className={`${t.textMuted} hover:${t.textPrimary} flex items-center justify-center rounded-full hover:${t.hoverBg} cursor-pointer`}
            style={{ width: 26, height: 26 }}
            title="Zoom out"
          >
            <IconZoomOut size={12} strokeWidth={2} />
          </button>
          <span className={`${t.textSecondary} text-[10px] font-bold font-mono text-center`} style={{ width: 36 }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => zoomBy(0.1)}
            className={`${t.textMuted} hover:${t.textPrimary} flex items-center justify-center rounded-full hover:${t.hoverBg} cursor-pointer`}
            style={{ width: 26, height: 26 }}
            title="Zoom in"
          >
            <IconZoomIn size={12} strokeWidth={2} />
          </button>
          {zoom !== 1 && (
            <button
              onClick={() => setZoom(1)}
              className={`${t.textMuted} hover:${t.textPrimary} flex items-center justify-center rounded-full hover:${t.hoverBg} cursor-pointer`}
              style={{ width: 26, height: 26 }}
              title="Reset Zoom"
            >
              <IconZoomReset size={12} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Docked Scrubber and Transport Toolbar */}
      <div className={`shrink-0 border-t ${t.borderB} ${t.panelBg} px-6 py-3 flex flex-col items-center select-none z-10`}>
        <div className="w-full max-w-2xl flex flex-col gap-2.5">
          {/* Custom micro timeline scrubber */}
          <div className="w-full flex items-center gap-3">
            <span className={`text-[10px] font-bold font-mono ${t.textMuted} w-10 text-left`}>
              {formatTime(currentTime)}
            </span>
            <div
              className={`flex-1 h-1.5 rounded-full ${t.subtleBg} border ${t.borderB} relative cursor-pointer group`}
              onClick={handleSeek}
            >
              <div
                className="absolute top-0 left-0 h-full rounded-full bg-neutral-900"
                style={{ width: `${progressPct}%` }}
              />
              <div
                className="absolute rounded-full bg-neutral-900 border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  width: 12,
                  height: 12,
                  top: -3.5,
                  left: `calc(${progressPct}% - 6px)`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                }}
              />
            </div>
            <span className={`text-[10px] font-bold font-mono ${t.textMuted} w-10 text-right`}>
              {formatTime(duration)}
            </span>
          </div>

          {/* Player Navigation Buttons */}
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMuted((m) => !m)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  muted
                    ? "bg-red-50 text-red-600 border-red-200"
                    : `${t.panelBg} ${t.borderB} ${t.textMuted} hover:${t.textPrimary}`
                }`}
                title={muted ? "Unmute audio" : "Mute audio"}
              >
                {muted ? <IconMute size={13} strokeWidth={2} /> : <IconVolume2 size={13} strokeWidth={2} />}
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = 0;
                }}
                className={`p-1.5 rounded-lg ${t.textMuted} hover:${t.textPrimary} hover:${t.hoverBg} cursor-pointer`}
                title="Go to start"
              >
                <IconPlayerSkipBack size={13} strokeWidth={2} />
              </button>
              <button
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 1 / 30);
                }}
                className={`p-1.5 rounded-lg ${t.textMuted} hover:${t.textPrimary} hover:${t.hoverBg} cursor-pointer`}
                title="Frame Back"
              >
                <IconFrameBack size={13} strokeWidth={2} />
              </button>

              <button
                onClick={togglePlay}
                className="p-2.5 rounded-full bg-neutral-900 text-white hover:bg-neutral-800 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-md"
                title={playing ? "Pause" : "Play"}
              >
                {playing ? (
                  <IconPlayerPause size={15} strokeWidth={2.5} fill="currentColor" />
                ) : (
                  <IconPlayerPlay size={15} strokeWidth={2.5} fill="currentColor" className="ml-0.5" />
                )}
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 1 / 30);
                }}
                className={`p-1.5 rounded-lg ${t.textMuted} hover:${t.textPrimary} hover:${t.hoverBg} cursor-pointer`}
                title="Frame Forward"
              >
                <IconFrameForward size={13} strokeWidth={2} />
              </button>
              <button
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = duration;
                }}
                className={`p-1.5 rounded-lg ${t.textMuted} hover:${t.textPrimary} hover:${t.hoverBg} cursor-pointer`}
                title="Go to end"
              >
                <IconPlayerSkipForward size={13} strokeWidth={2} />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setLoop((l) => !l)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  loop
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : `${t.panelBg} ${t.borderB} ${t.textMuted} hover:${t.textPrimary}`
                }`}
                title="Loop video"
              >
                <IconLoop size={13} strokeWidth={2} />
              </button>

              <div className="relative">
                <button
                  onClick={() => setSpeedOpen((o) => !o)}
                  className={`text-[10px] font-bold ${t.textMuted} hover:${t.textPrimary} border ${t.borderB} px-2 py-1.5 rounded-lg hover:${t.hoverBg} cursor-pointer`}
                >
                  {speed}
                </button>
                {speedOpen && (
                  <div className={`absolute bottom-full right-0 mb-1.5 ${t.panelBg} border ${t.borderB} rounded-xl overflow-hidden shadow-2xl z-30`}>
                    {speedOptions.map((s) => (
                      <button
                        key={s}
                        onClick={() => changeSpeed(s)}
                        className={`block w-full text-left px-3 py-1.5 text-[10px] font-bold cursor-pointer ${
                          s === speed ? "text-violet-500 font-bold bg-neutral-100 dark:bg-neutral-800" : `${t.textMuted} hover:${t.hoverBg}`
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => videoRef.current?.requestFullscreen?.()}
                className={`p-1.5 rounded-lg ${t.textMuted} hover:${t.textPrimary} hover:${t.hoverBg} cursor-pointer`}
                title="Fullscreen"
              >
                <IconFullscreen size={13} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
