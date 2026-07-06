/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  ChevronRight, 
  Languages, 
  Type, 
  Sparkles, 
  Volume2, 
  Pause, 
  Play 
} from 'lucide-react';
import { useStudio } from '../hooks/useStudio';
import { parseTimeToSeconds, cn } from '@video-voice-translator/utils';

export const EditorPanel: React.FC = () => {
  const {
    editorOpen,
    setEditorOpen,
    activeTab,
    setActiveTab,
    translationSegments,
    transcriptSegments,
    activeSegmentIndex,
    updateSegment,
    videoAnalysis,
    analysisAudio,
    isPlayingAnalysis,
    isReelMode,
    currentReelStep,
    handlePlayAnalysis,
    handleStartReel,
    translatedText,
    handleTranslateOnly,
    handleSpeechOnly,
    videoRef,
    safePlayVideo,
    playingTranslationIndex,
    playTranslationSegmentSpeech,
  } = useStudio();

  if (!editorOpen) return null;

  return (
    <motion.aside 
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 400, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="border-l border-neutral-850 bg-neutral-900 flex flex-col overflow-hidden shrink-0 h-full relative text-neutral-200"
    >
      {/* Tab Header Selector */}
      <div className="flex items-center border-b border-neutral-850 p-1 shrink-0 bg-neutral-905">
        <button 
          onClick={() => setActiveTab('translate')}
          className={cn(
            "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-md cursor-pointer",
            activeTab === 'translate' ? "text-white bg-neutral-800" : "text-neutral-400 hover:text-neutral-200"
          )}
        >
          Translate
        </button>
        <button 
          onClick={() => setActiveTab('transcript')}
          className={cn(
            "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-md cursor-pointer",
            activeTab === 'transcript' ? "text-white bg-neutral-800" : "text-neutral-400 hover:text-neutral-200"
          )}
        >
          Transcript
        </button>
        <button 
          onClick={() => setActiveTab('analysis')}
          className={cn(
            "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-md cursor-pointer",
            activeTab === 'analysis' ? "text-white bg-neutral-800" : "text-neutral-400 hover:text-neutral-200"
          )}
        >
          Analysis
        </button>
        <button 
          onClick={() => setEditorOpen(false)} 
          className="p-3 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Main Tab Content Viewport */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Translate Panel */}
        {activeTab === 'translate' && (
          <div className="space-y-3 pb-24">
            {translationSegments.length > 0 ? (
              <div className="space-y-1.5">
                {translationSegments.map((seg, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "p-3 rounded-xl transition-all border border-transparent cursor-pointer",
                      activeSegmentIndex === i ? "bg-violet-950/40 border-violet-900/60 shadow-md shadow-violet-500/5 text-violet-400" : "hover:bg-neutral-850 border-transparent"
                    )}
                    onClick={() => { 
                      if (videoRef.current) {
                        videoRef.current.currentTime = seg.time;
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
                        {seg.speaker} • {Math.floor(seg.time / 60)}:{Math.floor(seg.time % 60).toString().padStart(2, '0')}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playTranslationSegmentSpeech(i);
                        }}
                        className={`p-1 px-1.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                          playingTranslationIndex === i
                            ? "bg-violet-600/20 border-violet-500/50 text-violet-400"
                            : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-250"
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
                            <Volume2 size={11} />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Listen</span>
                          </>
                        )}
                      </button>
                    </div>
                    <textarea
                      value={seg.text}
                      onChange={(e) => updateSegment(i, e.target.value, 'translation')}
                      className="w-full bg-transparent border-none p-0 text-xs text-neutral-200 leading-relaxed focus:ring-0 resize-none font-medium outline-none"
                      rows={1}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-neutral-500 italic text-xs gap-4 text-center px-8">
                <Languages size={32} className="opacity-35" />
                <span>Translations will be generated after processing the video.</span>
              </div>
            )}
          </div>
        )}

        {/* Transcript Panel */}
        {activeTab === 'transcript' && (
          <div className="space-y-3 pb-24">
            {transcriptSegments.length > 0 ? (
              <div className="space-y-1.5">
                {transcriptSegments.map((seg, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "p-3 rounded-xl transition-all border border-transparent cursor-pointer",
                      activeSegmentIndex === i ? "bg-violet-950/40 border-violet-900/60 shadow-md shadow-violet-500/5 text-violet-400" : "hover:bg-neutral-850 border-transparent"
                    )}
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = seg.time;
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
                        {seg.speaker} • {Math.floor(seg.time / 60)}:{Math.floor(seg.time % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <textarea
                      value={seg.text}
                      onChange={(e) => updateSegment(i, e.target.value, 'transcript')}
                      className="w-full bg-transparent border-none p-0 text-xs text-neutral-200 leading-relaxed focus:ring-0 resize-none outline-none font-medium"
                      rows={1}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-neutral-500 italic text-xs gap-4 text-center px-8">
                <Type size={32} className="opacity-35" />
                <span>Transcripts will appear here after analysis.</span>
              </div>
            )}
          </div>
        )}

        {/* Analysis Panel */}
        {activeTab === 'analysis' && (
          <div className="space-y-6 pb-24">
            {videoAnalysis ? (
              <>
                {/* Summary block */}
                <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800/85 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">AI Summary</span>
                    {analysisAudio && (
                      <button 
                        onClick={handlePlayAnalysis}
                        className={cn(
                          "p-1.5 rounded-lg transition-all cursor-pointer",
                          isPlayingAnalysis ? "bg-rose-600 text-white" : "bg-neutral-850 text-violet-400 hover:bg-neutral-800 border border-neutral-800 shadow-md"
                        )}
                      >
                        {isPlayingAnalysis ? <Pause size={12} /> : <Volume2 size={12} />}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-neutral-350 leading-relaxed italic">
                    "{videoAnalysis.summary}"
                  </p>
                </div>

                {/* Highlights block */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Highlight Reels</span>
                    <button 
                      onClick={handleStartReel}
                      disabled={isReelMode}
                      className="text-[9px] font-bold text-violet-400 hover:text-violet-300 transition-colors uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                    >
                      <Play size={10} fill="currentColor" />
                      Play Reels
                    </button>
                  </div>
                  <div className="grid gap-2">
                    {videoAnalysis.highlights.map((highlight, i) => (
                      <button 
                        key={i}
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = parseTimeToSeconds(highlight.start);
                            safePlayVideo();
                          }
                        }}
                        className={cn(
                          "flex flex-col gap-2 p-3 rounded-xl border transition-all text-left group cursor-pointer",
                          isReelMode && currentReelStep === i 
                            ? "bg-violet-600 text-white border-violet-500 shadow-md animate-pulse" 
                            : "bg-neutral-950/60 border-neutral-850 hover:bg-neutral-850/60 text-neutral-300"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-[9px] font-mono font-bold", 
                            isReelMode && currentReelStep === i ? "text-violet-200" : "text-violet-400"
                          )}>
                            {highlight.start} - {highlight.end}
                          </span>
                          <div className={cn(
                            "w-2 h-2 rounded-full", 
                            isReelMode && currentReelStep === i ? "bg-white animate-pulse" : "bg-neutral-700"
                          )} />
                        </div>
                        <p className={cn(
                          "text-[11px] font-medium leading-snug", 
                          isReelMode && currentReelStep === i ? "text-white" : "text-neutral-400"
                        )}>
                          {highlight.narration}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-neutral-500 italic text-xs gap-4 text-center px-8">
                <Sparkles size={32} className="opacity-35" />
                <span>Run AI analysis to extract key highlights and insights.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Persistent Dock Action Buttons for Editors (Translate/Correction triggers) */}
      {translatedText && activeTab === 'translate' && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-850 bg-neutral-900/95 backdrop-blur-md flex gap-2">
          <button 
            onClick={handleTranslateOnly}
            className="flex-1 py-2.5 bg-neutral-800 text-neutral-200 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-neutral-750 active:scale-95 transition-all border border-neutral-750 cursor-pointer text-center"
          >
            Update Translation
          </button>
          <button 
            onClick={handleSpeechOnly}
            className="flex-1 py-2.5 bg-violet-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-violet-500 active:scale-95 transition-all cursor-pointer text-center"
          >
            Regenerate Dub
          </button>
        </div>
      )}
    </motion.aside>
  );
};
