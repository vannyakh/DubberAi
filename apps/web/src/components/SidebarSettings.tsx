/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Settings, ChevronLeft, Volume2, Loader2 } from 'lucide-react';
import { useStudio } from '../hooks/useStudio';
import { LANGUAGES, VOICES } from '@video-voice-translator/utils';
import { useThemeClasses } from '../context/ThemeContext';

export const SidebarSettings: React.FC = () => {
  const {
    sidebarOpen,
    setSidebarOpen,
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
    videoRef,

    // Google Drive Backups
    user,
    uploadVideoToDrive,
    uploadTranslatedAudioToDrive,
    isUploadingToDrive,
    driveVideoFile,
    driveAudioFile,
    videoFile,
    audioBase64
  } = useStudio();

  const t = useThemeClasses();

  if (!sidebarOpen) return null;

  return (
    <motion.aside 
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 300, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={`border-r ${t.borderB} ${t.panelBg} flex flex-col overflow-hidden shrink-0 h-full relative ${t.textPrimary}`}
    >
      {/* Sidebar Header */}
      <div className={`p-4 border-b ${t.borderB} flex items-center justify-between ${t.subtleBg}`}>
        <div className="flex items-center gap-2">
          <Settings size={14} className={t.accent} />
          <span className={`text-[10px] font-bold uppercase tracking-widest ${t.textMuted}`}>Settings</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(false)} 
          className={`p-1 hover:${t.hoverBg} rounded-md ${t.textMuted} hover:${t.textSecondary} transition-colors cursor-pointer`}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Settings Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Language Selection */}
        <div className="space-y-2">
          <label className={`text-[9px] font-bold uppercase tracking-wider ${t.textMuted} block`}>Target Language</label>
          <select 
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className={`w-full ${t.inputBg} border ${t.borderB} rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-violet-500/20 ${t.textPrimary} outline-none cursor-pointer`}
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code} className={`${t.dark ? 'bg-[#1B1712] text-[#F5F1E8]' : 'bg-white text-neutral-800'}`}>{lang.name}</option>
            ))}
          </select>
        </div>

        {/* Voice Selection */}
        <div className="space-y-2">
          <label className={`text-[9px] font-bold uppercase tracking-wider ${t.textMuted} block`}>Main Narrator</label>
          <select 
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className={`w-full ${t.inputBg} border ${t.borderB} rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-violet-500/20 ${t.textPrimary} outline-none cursor-pointer`}
          >
            {VOICES.map(v => (
              <option key={v.id} value={v.id} className={`${t.dark ? 'bg-[#1B1712] text-[#F5F1E8]' : 'bg-white text-neutral-800'}`}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Mixing Hub */}
        <div className={`space-y-4 pt-4 border-t ${t.borderB}`}>
          <div className="flex items-center gap-2 mb-2">
            <Volume2 size={12} className={t.accent} />
            <span className={`text-[9px] font-bold uppercase tracking-wider ${t.textMuted}`}>Audio Mixing</span>
          </div>
          
          <div className={`space-y-4 ${t.subtleBg} border ${t.borderB} p-4 rounded-xl`}>
            <div className="space-y-2">
              <div className={`flex justify-between items-center text-[9px] font-bold ${t.textMuted} uppercase tracking-widest`}>
                <span>Original Backing</span>
                <span className={`${t.accent} font-mono`}>{Math.round(originalVolume * 100)}%</span>
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
                className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-neutral-200 dark:bg-neutral-800 accent-violet-500"
              />
            </div>

            <div className="space-y-2">
              <div className={`flex justify-between items-center text-[9px] font-bold ${t.textMuted} uppercase tracking-widest`}>
                <span>AI Voice Over</span>
                <span className={`${t.accent} font-mono`}>{Math.round(voiceVolume * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="2" 
                step="0.05" 
                value={voiceVolume}
                onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-neutral-200 dark:bg-neutral-800 accent-violet-500"
              />
            </div>
          </div>
        </div>

        {/* Speaker Assignment */}
        {detectedSpeakers.length > 0 && (
          <div className={`space-y-4 pt-4 border-t ${t.borderB}`}>
            <label className={`text-[9px] font-bold uppercase tracking-wider ${t.textMuted} block`}>Speaker Voices</label>
            <div className="space-y-2">
              {detectedSpeakers.map(speaker => (
                <div key={speaker} className={`flex flex-col gap-1.5 p-2.5 ${t.subtleBg} border ${t.borderB} rounded-lg`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-semibold ${t.textSecondary} truncate max-w-[150px]`}>{speaker}</span>
                    <button 
                      onClick={() => handlePreviewVoice(speaker)} 
                      disabled={previewingSpeaker !== null} 
                      className={`p-1 hover:${t.hoverBg} rounded-md ${t.accent} transition-colors disabled:opacity-30 cursor-pointer`}
                      title="Preview Voice"
                    >
                      {previewingSpeaker === speaker ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Volume2 size={11} />
                      )}
                    </button>
                  </div>
                  <select 
                    value={speakerVoices[speaker] || 'Kore'}
                    onChange={(e) => updateSpeakerVoice(speaker, e.target.value)}
                    className={`border ${t.borderB} rounded-md px-2 py-1 text-[9px] font-medium ${t.textPrimary} ${t.inputBg} outline-none cursor-pointer w-full focus:ring-1 focus:ring-violet-500/20`}
                  >
                    {VOICES.map(v => (
                      <option key={v.id} value={v.id} className={`${t.dark ? 'bg-[#1B1712] text-[#F5F1E8]' : 'bg-white text-neutral-800'}`}>{v.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Google Drive Storage Panel */}
        <div className={`space-y-4 pt-4 border-t ${t.borderB}`}>
          <div className="flex items-center gap-2 mb-2">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-3.5 h-3.5">
              <path fill="#0066da" d="M16.32 15l-10.45 18 6.55 11.25 10.45-18z"></path>
              <path fill="#00ac47" d="M28.32 15l-6 10.5 6.55 11.25H42l-6-10.5z"></path>
              <path fill="#ffba00" d="M22.32 25.5L16.32 15H29.7l6 10.5z"></path>
            </svg>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${t.textMuted}`}>Google Drive Backups</span>
          </div>

          <div className={`${t.subtleBg} border ${t.borderB} p-3 rounded-xl space-y-3.5`}>
            {user ? (
              <div className="space-y-3">
                {/* Upload Source Video */}
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between text-[10px] text-neutral-300">
                    <span className={`font-semibold ${t.textMuted}`}>Source Video Backup</span>
                    {driveVideoFile ? (
                      <span className="text-emerald-500 font-bold text-[9px] uppercase font-mono bg-emerald-950/40 border border-emerald-900/40 px-1.5 py-0.5 rounded">Synced</span>
                    ) : (
                      <span className={`font-bold text-[9px] uppercase font-mono ${t.textMuted}`}>Unsaved</span>
                    )}
                  </div>
                  {driveVideoFile ? (
                    <a
                      href={driveVideoFile.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full h-8 flex items-center justify-center gap-1.5 ${t.subtleBg} hover:${t.hoverBg} border ${t.borderB} rounded-lg text-[10px] font-bold ${t.accent} transition-all text-center`}
                    >
                      View Source on Drive
                    </a>
                  ) : (
                    <button
                      onClick={uploadVideoToDrive}
                      disabled={isUploadingToDrive || !videoFile}
                      className={`w-full h-8 flex items-center justify-center gap-1.5 ${t.inputBg} hover:${t.hoverBg} disabled:opacity-30 border ${t.borderB} rounded-lg text-[10px] font-bold ${t.textSecondary} transition-all cursor-pointer`}
                    >
                      {isUploadingToDrive ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <svg className="w-3 h-3 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      )}
                      Upload Source Video
                    </button>
                  )}
                </div>

                {/* Upload Translated Audio */}
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between text-[10px] text-neutral-300">
                    <span className={`font-semibold ${t.textMuted}`}>Translated Audio Backup</span>
                    {driveAudioFile ? (
                      <span className="text-emerald-500 font-bold text-[9px] uppercase font-mono bg-emerald-950/40 border border-emerald-900/40 px-1.5 py-0.5 rounded">Synced</span>
                    ) : (
                      <span className={`font-bold text-[9px] uppercase font-mono ${t.textMuted}`}>Unsaved</span>
                    )}
                  </div>
                  {driveAudioFile ? (
                    <a
                      href={driveAudioFile.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full h-8 flex items-center justify-center gap-1.5 ${t.subtleBg} hover:${t.hoverBg} border ${t.borderB} rounded-lg text-[10px] font-bold ${t.accent} transition-all text-center`}
                    >
                      View Audio on Drive
                    </a>
                  ) : (
                    <button
                      onClick={uploadTranslatedAudioToDrive}
                      disabled={isUploadingToDrive || !audioBase64}
                      className={`w-full h-8 flex items-center justify-center gap-1.5 ${t.inputBg} hover:${t.hoverBg} disabled:opacity-30 border ${t.borderB} rounded-lg text-[10px] font-bold ${t.textSecondary} transition-all cursor-pointer`}
                    >
                      {isUploadingToDrive ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <svg className="w-3 h-3 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      )}
                      Upload Translated Audio
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-2 space-y-2">
                <p className={`text-[10px] ${t.textMuted}`}>Sign in on the welcome screen to activate Google Drive backup and real-time cloud sync.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  );
};
