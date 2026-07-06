/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import {
  Play as IconPlayerPlay,
  Pause as IconPlayerPause,
  Scissors as IconScissors,
  Copy as IconCopy,
  Trash2 as IconTrash,
  ZoomIn as IconZoomIn,
  ZoomOut as IconZoomOut,
  Maximize2 as IconFit,
  Type as IconTypography,
  Smile as IconMoodSmile,
  Video as IconVideo,
  Music as IconMusic,
  Link2 as IconGroup,
  Magnet as IconSnap,
  Sparkles as IconSparkles,
  Loader2 as IconLoader,
  Mic2 as IconMic,
} from "lucide-react";
import { useStudio } from "../hooks/useStudio";
import { SelectedClip } from "./RightPanel";
import { useThemeClasses } from "../context/ThemeContext";

interface TimelineTrackProps {
  selectedClip: SelectedClip | null;
  onSelectClip: (clip: SelectedClip | null) => void;
  height?: number;
}

const TRACK_HEADER_WIDTH = 150;

export const TimelineTrack: React.FC<TimelineTrackProps> = ({ selectedClip, onSelectClip, height = 176 }) => {
  const {
    currentTime,
    duration,
    status,
    audioBase64,
    isSyncPlaying,
    translationSegments,
    transcriptSegments,
    handleProcess,
    handleToggleSyncPlayback,
    videoRef,
    safePlayVideo,
    safePauseVideo,
  } = useStudio();

  const [zoom, setZoom] = useState<number>(1);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const timelineTracksRef = useRef<HTMLDivElement>(null);
  const t = useThemeClasses();

  const segments = translationSegments.length > 0 ? translationSegments : transcriptSegments;

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        safePlayVideo();
      } else {
        safePauseVideo();
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - TRACK_HEADER_WIDTH;
    if (x < 0 || !duration) return;
    const laneWidth = rect.width - TRACK_HEADER_WIDTH;
    const pct = Math.max(0, Math.min(1, x / laneWidth));
    if (videoRef.current) {
      videoRef.current.currentTime = pct * duration;
    }
  };

  const getClipStyle = (startSecs: number, endSecs: number) => {
    if (!duration) return { left: "0%", width: "0%" };
    const leftPct = (startSecs / duration) * 100;
    const widthPct = ((endSecs - startSecs) / duration) * 100;
    return {
      left: `${leftPct}%`,
      width: `${widthPct}%`,
    };
  };

  const textClips = segments.map((seg, idx) => {
    const nextStart = segments[idx + 1]?.time ?? duration;
    const clipEnd = Math.min(nextStart, seg.time + 3.5);
    return {
      id: `text-${idx}`,
      type: "text" as const,
      name: seg.text,
      start: seg.time,
      end: clipEnd,
    };
  });

  const stickerClips = segments.length > 0 ? [
    {
      id: "sticker-1",
      type: "sticker" as const,
      name: "Happy Smile Emoji",
      start: segments[0].time + 1.5,
      end: segments[0].time + 4.5,
    }
  ] : [];

  const videoClips = duration > 0 ? [
    {
      id: "video-1",
      type: "video" as const,
      name: "Primary Video Content",
      start: 0,
      end: duration,
    }
  ] : [];

  const voiceClips = audioBase64 && duration > 0 ? [
    {
      id: "voice-1",
      type: "audio" as const,
      name: "AI Dubbing Voiceover",
      start: 0,
      end: duration,
    }
  ] : [];

  const activePlayheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      style={{ height }}
      className={`${t.panelBg} border-t ${t.borderB} flex flex-col shrink-0 z-10 select-none min-w-0`}
    >
      {/* Timeline Control Toolbar */}
      <div className={`h-11 shrink-0 flex items-center justify-between px-3 border-b ${t.borderB} gap-3 ${t.subtleBg}`}>
        <div className="flex items-center gap-3 overflow-x-auto min-w-0 no-scrollbar">
          {/* Main Action buttons */}
          <div className={`flex items-center gap-1.5 border-r ${t.borderB} pr-3`}>
            <button
              onClick={handlePlayPause}
              className="w-8 h-8 flex items-center justify-center bg-neutral-900 text-white hover:bg-neutral-800 rounded-lg hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md shrink-0"
              title={videoRef.current?.paused ? "Play" : "Pause"}
            >
              {videoRef.current?.paused ? (
                <IconPlayerPlay size={12} fill="currentColor" className="ml-0.5" />
              ) : (
                <IconPlayerPause size={12} fill="currentColor" />
              )}
            </button>

            <div className={`text-[10px] font-mono font-bold ${t.textMuted} shrink-0`}>
              <span className={t.textPrimary}>{formatTime(currentTime)}</span>
              <span className="mx-1 opacity-40">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* AI dub processing triggers */}
          <div className={`flex items-center gap-1.5 border-r ${t.borderB} pr-3 shrink-0`}>
            <button
              onClick={handleProcess}
              disabled={status !== "idle"}
              className="px-3.5 py-1.5 bg-neutral-900 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              {status === "idle" ? <IconSparkles size={11} /> : <IconLoader size={11} className="animate-spin" />}
              Process AI
            </button>

            <button
              onClick={handleToggleSyncPlayback}
              disabled={!audioBase64}
              className={`px-3.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border ${
                isSyncPlaying
                  ? "bg-violet-600 border-violet-600 text-white"
                  : `${t.panelBg} ${t.borderB} ${t.textSecondary} hover:${t.hoverBg} disabled:opacity-35`
              }`}
            >
              {isSyncPlaying ? <IconPlayerPause size={11} /> : <IconMic size={11} />}
              Live Preview
            </button>
          </div>

          {/* Timeline clips manipulation */}
          <div className="flex items-center gap-0.5">
            <button className={`p-1.5 rounded-lg hover:${t.hoverBg} ${t.textMuted} hover:${t.textPrimary} cursor-pointer`} title="Split clip">
              <IconScissors size={14} />
            </button>
            <button className={`p-1.5 rounded-lg hover:${t.hoverBg} ${t.textMuted} hover:${t.textPrimary} cursor-pointer`} title="Duplicate clip">
              <IconCopy size={14} />
            </button>
            <button className={`p-1.5 rounded-lg hover:${t.hoverBg} ${t.textMuted} hover:${t.textPrimary} cursor-pointer`} title="Group clips">
              <IconGroup size={14} />
            </button>
            <button
              onClick={() => onSelectClip(null)}
              disabled={!selectedClip}
              className={`p-1.5 rounded-lg hover:${t.hoverBg} ${t.textMuted} disabled:opacity-30 cursor-pointer`}
              title="Delete selection"
            >
              <IconTrash size={14} />
            </button>
          </div>

          <div className={`w-px ${t.dark ? "bg-neutral-800" : "bg-neutral-200"} h-5`} />

          {/* Timeline behavior */}
          <button
            onClick={() => setSnapEnabled(!snapEnabled)}
            className={`p-1.5 rounded-lg cursor-pointer transition-all border ${
              snapEnabled
                ? "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800/40 text-violet-500"
                : `${t.textMuted} hover:${t.hoverBg} hover:${t.textPrimary} border-transparent`
            }`}
            title="Toggle Snap aligning"
          >
            <IconSnap size={14} />
          </button>
        </div>

        {/* Zoom adjustment sliders */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className={`p-1.5 rounded-lg hover:${t.hoverBg} ${t.textMuted} hover:${t.textPrimary} cursor-pointer`}
            title="Zoom out"
          >
            <IconZoomOut size={14} />
          </button>
          <span className={`text-[10px] font-bold ${t.textMuted} w-8 text-center`}>{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className={`p-1.5 rounded-lg hover:${t.hoverBg} ${t.textMuted} hover:${t.textPrimary} cursor-pointer`}
            title="Zoom in"
          >
            <IconZoomIn size={14} />
          </button>
          <button
            onClick={() => setZoom(1)}
            className={`p-1.5 rounded-lg hover:${t.hoverBg} ${t.textMuted} hover:${t.textPrimary} cursor-pointer`}
            title="Fit zoom to window"
          >
            <IconFit size={14} />
          </button>
        </div>
      </div>

      {/* Main lanes container */}
      <div className={`flex-1 overflow-y-auto relative min-w-0 flex flex-col ${t.panelBg}`} ref={timelineTracksRef}>
        {/* Timeline ruler */}
        <div
          className={`h-6 shrink-0 border-b ${t.borderB} flex items-center relative cursor-pointer ${t.panelBg}`}
          style={{ paddingLeft: TRACK_HEADER_WIDTH }}
          onClick={handleScrub}
        >
          {Array.from({ length: Math.ceil(duration || 30) }).map((_, i) => (
            <span
              key={i}
              className={`text-[9px] font-mono font-bold ${t.textMuted} absolute -translate-x-1/2 select-none`}
              style={{ left: `${TRACK_HEADER_WIDTH + i * 50 * zoom}px` }}
            >
              {i}s
            </span>
          ))}
        </div>

        {/* Tracks lanes layout area */}
        <div className="flex-1 min-h-0 relative">
          {/* Vertical playhead line */}
          <div
            className="absolute top-0 bottom-0 w-px bg-violet-500 z-20 pointer-events-none"
            style={{
              left: `calc(${TRACK_HEADER_WIDTH}px + ${activePlayheadPct}% * (100% - ${TRACK_HEADER_WIDTH}px) / 100)`,
            }}
          >
            <div className="bg-violet-500 rounded-full w-2 h-2 absolute -top-1 -left-1 shadow-md" />
          </div>

          {/* LANES STACK */}
          <div className={`space-y-px ${t.dark ? 'bg-neutral-850/45' : 'bg-neutral-200'}`}>
            {/* 1. Video track */}
            <div className={`flex h-9 items-center border-b ${t.borderB}`}>
              <div
                className={`w-[150px] shrink-0 ${t.subtleBg} px-3 flex items-center gap-2 border-r ${t.borderB} h-full`}
                style={{ width: TRACK_HEADER_WIDTH }}
              >
                <IconVideo size={13} className={`${t.textMuted} shrink-0`} />
                <span className={`text-[10px] font-bold ${t.textSecondary} truncate`}>Video Track</span>
              </div>
              <div className={`flex-1 relative h-full bg-neutral-500/5 cursor-pointer`} onClick={handleScrub}>
                {videoClips.map((clip) => {
                  const active = selectedClip?.id === clip.id;
                  return (
                    <button
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClip(clip);
                      }}
                      className={`absolute top-1 bottom-1 rounded-lg border text-left px-3 text-[10px] font-semibold flex items-center transition-all ${
                        active
                          ? "bg-neutral-900 text-white border-neutral-900 shadow-md"
                          : `${t.panelBg} ${t.textPrimary} ${t.borderB} hover:${t.hoverBg}`
                      }`}
                      style={getClipStyle(clip.start, clip.end)}
                    >
                      <span className="truncate">{clip.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Text/Subtitle track */}
            <div className={`flex h-9 items-center border-b ${t.borderB}`}>
              <div
                className={`w-[150px] shrink-0 ${t.subtleBg} px-3 flex items-center gap-2 border-r ${t.borderB} h-full`}
                style={{ width: TRACK_HEADER_WIDTH }}
              >
                <IconTypography size={13} className={`${t.textMuted} shrink-0`} />
                <span className={`text-[10px] font-bold ${t.textSecondary} truncate`}>Subtitles</span>
              </div>
              <div className={`flex-1 relative h-full bg-neutral-500/5 cursor-pointer`} onClick={handleScrub}>
                {textClips.map((clip) => {
                  const active = selectedClip?.id === clip.id;
                  return (
                    <button
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClip(clip);
                        if (videoRef.current) {
                          videoRef.current.currentTime = clip.start;
                        }
                      }}
                      className={`absolute top-1 bottom-1 rounded-lg border text-left px-2 text-[9px] font-bold flex items-center transition-all ${
                        active
                          ? "bg-neutral-900 text-white border-neutral-900 shadow-md"
                          : "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-900/50 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                      }`}
                      style={getClipStyle(clip.start, clip.end)}
                    >
                      <span className="truncate">{clip.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Audio/Voice track */}
            <div className={`flex h-9 items-center border-b ${t.borderB}`}>
              <div
                className={`w-[150px] shrink-0 ${t.subtleBg} px-3 flex items-center gap-2 border-r ${t.borderB} h-full`}
                style={{ width: TRACK_HEADER_WIDTH }}
              >
                <IconMusic size={13} className={`${t.textMuted} shrink-0`} />
                <span className={`text-[10px] font-bold ${t.textSecondary} truncate`}>Voiceover</span>
              </div>
              <div className={`flex-1 relative h-full bg-neutral-500/5 cursor-pointer`} onClick={handleScrub}>
                {voiceClips.map((clip) => {
                  const active = selectedClip?.id === clip.id;
                  return (
                    <button
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClip(clip);
                      }}
                      className={`absolute top-1 bottom-1 rounded-lg border text-left px-3 text-[10px] font-semibold flex items-center transition-all ${
                        active
                          ? "bg-neutral-900 text-white border-neutral-900 shadow-md"
                          : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                      }`}
                      style={getClipStyle(clip.start, clip.end)}
                    >
                      <div className="flex items-center gap-1.5 w-full h-full">
                        {/* Fake audio wave rendering */}
                        <div className="flex items-center gap-0.5 h-3">
                          {[2, 4, 1, 5, 2, 4, 3, 5, 1, 4].map((h, i) => (
                            <div
                              key={i}
                              className={`w-[1.5px] rounded-full ${
                                active ? "bg-white" : "bg-emerald-500"
                              }`}
                              style={{ height: `${h * 2}px` }}
                            />
                          ))}
                        </div>
                        <span className="truncate">{clip.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Stickers track */}
            <div className={`flex h-9 items-center border-b ${t.borderB}`}>
              <div
                className={`w-[150px] shrink-0 ${t.subtleBg} px-3 flex items-center gap-2 border-r ${t.borderB} h-full`}
                style={{ width: TRACK_HEADER_WIDTH }}
              >
                <IconMoodSmile size={13} className={`${t.textMuted} shrink-0`} />
                <span className={`text-[10px] font-bold ${t.textSecondary} truncate`}>Stickers</span>
              </div>
              <div className={`flex-1 relative h-full bg-neutral-500/5 cursor-pointer`} onClick={handleScrub}>
                {stickerClips.map((clip) => {
                  const active = selectedClip?.id === clip.id;
                  return (
                    <button
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClip(clip);
                      }}
                      className={`absolute top-1 bottom-1 rounded-lg border text-left px-3 text-[10px] font-semibold flex items-center transition-all ${
                        active
                          ? "bg-neutral-900 text-white border-neutral-900 shadow-md"
                          : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                      }`}
                      style={getClipStyle(clip.start, clip.end)}
                    >
                      <span className="truncate">{clip.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
