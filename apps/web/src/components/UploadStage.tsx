/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import {
  Languages,
  Upload,
  Plus,
  FolderOpen,
  Trash2,
  ArrowLeft,
  Sparkles,
  Calendar,
  Eye,
  Globe,
  Music,
  Video,
  FileVideo,
  Check,
  X,
  ChevronRight,
  User,
  Moon,
  Sun,
  Play,
  Pause,
  Download,
  Tv,
  Users,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import { useStudio } from '../hooks/useStudio';
import { useTheme } from '../context/ThemeContext';
import { cn } from '@video-voice-translator/utils';

export const UploadStage: React.FC = () => {
  const { 
    onDropFile, 
    loadDemoVideo, 
    projectId, 
    projectName, 
    recentProjects, 
    createProject, 
    loadProject, 
    deleteProject, 
    exitProject,
    user,
    isLoggingIn,
    handleLogin,
    handleLogout
  } = useStudio();

  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  // Palette mappings to perfectly replicate the vintage studio aesthetic in the mockup
  const c = {
    dark,
    bg: dark ? "bg-[#100E0B]" : "bg-[#F7F4EC]",
    surface: dark ? "bg-[#1B1712]" : "bg-[#FFFFFF]",
    surfaceHi: dark ? "bg-[#231E17]" : "bg-[#FBF8F0]",
    border: dark ? "border-[#F5F1E8]/10" : "border-[#1A1712]/10",
    borderStrong: dark ? "border-[#F5F1E8]/20" : "border-[#1A1712]/16",
    text: dark ? "text-[#F5F1E8]" : "text-[#1A1712]",
    textSecondary: dark ? "text-[#E2DCCE]" : "text-[#3E382E]",
    textMuted: dark ? "text-[#A69C87]" : "text-[#6E6656]",
    textFaint: dark ? "text-[#71695A]" : "text-[#9C927C]",
    accent: dark ? "text-[#E8A33D]" : "text-[#B9701A]",
    accentBg: dark ? "bg-[#E8A33D]" : "bg-[#B9701A]",
    accentInk: dark ? "text-[#241A08]" : "text-[#FFFFFF]",
    accent2: dark ? "text-[#54D6C9]" : "text-[#0E8F82]",
    accent2Bg: dark ? "bg-[#54D6C9]" : "bg-[#0E8F82]",
    accentSoft: dark ? "bg-[#E8A33D]/14" : "bg-[#B9701A]/10",
    accent2Soft: dark ? "bg-[#54D6C9]/13" : "bg-[#0E8F82]/10",
    inputBg: dark ? "bg-[#231E17]" : "bg-[#FFFFFF]",
    gridLine: dark ? "rgba(245,241,232,0.055)" : "rgba(20,18,15,0.06)",
  };

  const [tab, setTab] = useState<'create' | 'open'>('create');
  const [newProjectName, setNewProjectName] = useState('');
  const [inputProjectId, setInputProjectId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Interactive Demo Slider State
  const [activeDemoIndex, setActiveDemoIndex] = useState(0);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [demoProgress, setDemoProgress] = useState(38);

  // Billing interval state
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Pulse flash effect state for Pro card
  const [flashPro, setFlashPro] = useState(false);

  const DEMO_SLIDES = [
    {
      lang: "EN — Original",
      caption: "Welcome back to the studio — today we're mixing the final cut.",
      duration: "00:24",
      bgGradient: dark ? "from-[#E8A33D]/18 to-[#54D6C9]/14" : "from-[#B9701A]/10 to-[#0E8F82]/10"
    },
    {
      lang: "KM — Translated",
      caption: "សូមស្វាគមន៍មកកាន់ស្ទូឌីយោវិញ — ថ្ងៃនេះយើងកំពុងលាយសំឡេងចុងក្រោយ។",
      duration: "00:24",
      bgGradient: dark ? "from-[#54D6C9]/20 to-[#E8A33D]/10" : "from-[#0E8F82]/12 to-[#B9701A]/08"
    },
    {
      lang: "TH — Translated",
      caption: "ยินดีต้อนรับกลับสู่สตูดิโอ — วันนี้เรากำลังมิกซ์การตัดต่อสุดท้าย",
      duration: "00:24",
      bgGradient: dark ? "from-[#E8A33D]/16 to-[#54D6C9]/16" : "from-[#B9701A]/10 to-[#0E8F82]/10"
    },
    {
      lang: "JA — Translated",
      caption: "スタジオへお帰りなさい — 今日は最終ミックスをしています。",
      duration: "00:24",
      bgGradient: dark ? "from-[#54D6C9]/18 to-[#E8A33D]/14" : "from-[#0E8F82]/10 to-[#B9701A]/12"
    }
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (demoPlaying) {
      interval = setInterval(() => {
        setDemoProgress(p => {
          if (p >= 100) {
            setDemoPlaying(false);
            return 100;
          }
          return p + 1.5;
        });
      }, 80);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [demoPlaying]);

  const handleDemoPlayToggle = () => {
    if (demoPlaying) {
      setDemoPlaying(false);
    } else {
      setDemoProgress(0);
      setDemoPlaying(true);
    }
  };

  const handleLanguageChange = (idx: number) => {
    setActiveDemoIndex(idx);
    setDemoPlaying(false);
    setDemoProgress(idx === 0 ? 38 : idx === 1 ? 52 : idx === 2 ? 24 : 66);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      setErrorMsg('Please enter a valid project name.');
      return;
    }
    setErrorMsg('');
    createProject(newProjectName.trim());
    setNewProjectName('');
  };

  const handleLoad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputProjectId.trim()) {
      setErrorMsg('Please enter a Project ID.');
      return;
    }
    const cleanId = inputProjectId.trim().toUpperCase();
    const success = loadProject(cleanId);
    if (success) {
      setErrorMsg('');
      setInputProjectId('');
    } else {
      setErrorMsg(`Project "${cleanId}" not found. Verify the ID.`);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles[0]) {
        onDropFile(acceptedFiles[0]);
      }
    },
    accept: { 'video/*': [] } as Record<string, string[]>,
    multiple: false
  });

  const triggerProFlash = () => {
    const target = document.getElementById("proCard");
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFlashPro(true);
      setTimeout(() => setFlashPro(false), 1000);
    }
  };

  return (
    <div className={cn("min-h-screen relative overflow-x-hidden transition-colors duration-300", c.bg, c.text)}>
      
      {/* 1. Grid Background & Radial Ambient Glow */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(${c.gridLine} 1px, transparent 1px),
            linear-gradient(90deg, ${c.gridLine} 1px, transparent 1px)
          `,
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse 90% 65% at 50% 32%, #000 0%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 65% at 50% 32%, #000 0%, transparent 78%)',
        }}
      />
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-90"
        style={{
          background: `radial-gradient(620px 420px at 50% 26%, ${dark ? "rgba(232,163,61,0.14)" : "rgba(185,112,26,0.1)"}, transparent 68%)`,
        }}
      />

      {/* 2. Topbar Header */}
      <header className="max-w-[1180px] mx-auto px-6 py-6 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-3">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shadow-lg cursor-default", c.accentBg, c.accentInk)}>
            <Play size={18} fill="currentColor" className="ml-0.5" />
          </div>
          <div className="flex flex-col leading-none">
            <span className={cn("text-base font-bold tracking-tight", c.text)}>Vokop</span>
            <span className={cn("text-[10.5px] mt-0.5 font-medium", c.textMuted)}>Video Voice Translator</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language toggle stub */}
          <button 
            className={cn("w-9 h-9 rounded-xl flex items-center justify-center border transition-all hover:scale-105 active:scale-95", c.surface, c.border, c.textMuted, "hover:" + c.text)}
            title="Choose workspace language"
          >
            <Globe size={16} />
          </button>

          {/* Theme switcher */}
          <button 
            onClick={toggleTheme}
            className={cn("w-9 h-9 rounded-xl flex items-center justify-center border transition-all hover:scale-105 active:scale-95", c.surface, c.border, c.textMuted, "hover:" + c.text)}
            title="Toggle theme visual layout"
            id="themeToggleBtn"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Google Auth Integration button */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className={cn("border rounded-xl p-1 flex items-center gap-2 pr-3.5", c.surface, c.border)}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User Avatar" className="w-7 h-7 rounded-lg border" referrerPolicy="no-referrer" />
                ) : (
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase", c.accentBg, c.accentInk)}>
                    {user.displayName ? user.displayName[0] : 'U'}
                  </div>
                )}
                <span className={cn("text-xs font-bold truncate max-w-[90px] hidden sm:inline", c.textSecondary)}>
                  {user.displayName || 'Developer'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className={cn("px-3 py-2 border rounded-xl text-xs font-bold cursor-pointer transition-all hover:bg-rose-950/20 hover:text-rose-500", c.border, c.textMuted)}
              >
                Exit
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className={cn("h-9 px-4 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shadow-md active:scale-95 border", c.surface, c.border, c.textSecondary, "hover:" + c.text)}
            >
              {isLoggingIn ? (
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-t-transparent border-violet-500" />
              ) : (
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-3.5 h-3.5">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
              )}
              <span>Log In</span>
            </button>
          )}
        </div>
      </header>

      {/* 3. Hero Copy */}
      <section className="max-w-[720px] mx-auto pt-16 pb-6 px-6 text-center relative z-10">
        <div className={cn("w-14 h-14 rounded-[18px] mx-auto mb-6 flex items-center justify-center shadow-lg transition-transform hover:scale-105", c.accentSoft, c.accent)}>
          <Languages size={24} />
        </div>
        <h1 className={cn("font-serif text-3xl sm:text-5xl font-medium tracking-tight leading-[1.12] mb-4", c.text)}>
          Video Voice Translator
        </h1>
        <p className={cn("text-sm sm:text-base leading-relaxed max-w-[480px] mx-auto", c.textMuted)}>
          Transcribe, translate, and voice over your videos with AI precision — accents, pacing, and tone all preserved.
        </p>
      </section>

      {/* 4. Onboarding Hub Card Wrapper (Upload or Project Context) */}
      <div className="max-w-[640px] mx-auto px-6 relative z-10 mb-14">
        <AnimatePresence mode="wait">
          {!projectId ? (
            /* ACTIVE HUB: CREATE/OPEN PROJECTS */
            <motion.div
              key="project_selection"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn("border rounded-[22px] p-6 sm:p-10 text-center shadow-2xl backdrop-blur-md space-y-6", c.borderStrong, c.surface)}
            >
              {/* Tab Selector */}
              <div className={cn("flex p-1 rounded-xl border", c.bg, c.border)}>
                <button
                  type="button"
                  onClick={() => { setTab('create'); setErrorMsg(''); }}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                    tab === 'create' 
                      ? (dark ? "bg-[#E8A33D]/20 text-[#E8A33D]" : "bg-[#B9701A]/10 text-[#B9701A]") 
                      : c.textMuted + " hover:" + c.text
                  )}
                  id="tab_create_project"
                >
                  <Plus size={14} />
                  Create Project
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('open'); setErrorMsg(''); }}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                    tab === 'open' 
                      ? (dark ? "bg-[#E8A33D]/20 text-[#E8A33D]" : "bg-[#B9701A]/10 text-[#B9701A]") 
                      : c.textMuted + " hover:" + c.text
                  )}
                  id="tab_open_project"
                >
                  <FolderOpen size={14} />
                  Open Project
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-950/20 border border-red-900/40 text-red-400 rounded-xl text-xs text-center font-semibold animate-pulse">
                  {errorMsg}
                </div>
              )}

              {tab === 'create' ? (
                /* TAB: CREATE PROJECT */
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className={cn("text-[9.5px] font-bold uppercase tracking-wider", c.textMuted)}>
                      Project Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Marketing Reel, Course Translation..."
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className={cn("w-full px-4 py-3 border text-xs font-semibold rounded-xl focus:border-violet-500 outline-none transition-all placeholder:opacity-50", c.border, c.inputBg, c.text)}
                      id="input_new_project_name"
                    />
                  </div>

                  <button
                    type="submit"
                    className={cn("w-full py-3 px-6 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]", c.accentBg, c.accentInk)}
                    id="btn_submit_create_project"
                  >
                    <Sparkles size={14} />
                    Create New Project
                  </button>
                </form>
              ) : (
                /* TAB: OPEN PROJECT ID */
                <form onSubmit={handleLoad} className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className={cn("text-[9.5px] font-bold uppercase tracking-wider", c.textMuted)}>
                      Project ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PRJ-XXXX-XXXX"
                      value={inputProjectId}
                      onChange={(e) => setInputProjectId(e.target.value)}
                      className={cn("w-full px-4 py-3 border text-xs font-mono font-bold uppercase rounded-xl focus:border-violet-500 outline-none transition-all placeholder:opacity-40", c.border, c.inputBg, c.text)}
                      id="input_open_project_id"
                    />
                  </div>

                  <button
                    type="submit"
                    className={cn("w-full py-3 px-6 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border hover:scale-[1.01] active:scale-[0.99]", c.surface, c.border, c.textSecondary, "hover:" + c.text)}
                    id="btn_submit_open_project_id"
                  >
                    <FolderOpen size={14} />
                    Load Project
                  </button>
                </form>
              )}

              {/* Skip Onboarding / Trial Trigger */}
              <div className="pt-2 text-center border-t border-dashed border-[#F5F1E8]/10">
                <button
                  type="button"
                  onClick={loadDemoVideo}
                  className={cn("text-xs transition-colors font-semibold flex items-center justify-center gap-1.5 mx-auto cursor-pointer", c.accent)}
                  id="btn_demo_without_project"
                >
                  <Sparkles size={12} className="animate-pulse" />
                  Or skip onboarding and try Demo Workspace directly
                </button>
              </div>
            </motion.div>
          ) : (
            /* ACTIVE HUB: DRAG & DROP ZONE */
            <motion.div
              key="video_upload"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-5"
            >
              {/* Active Project Header Context */}
              <div className={cn("flex items-center justify-between p-4 border rounded-2xl backdrop-blur-sm", c.border, c.surface)}>
                <div className="space-y-0.5 text-left">
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider", c.accent)}>
                    Active Project Context
                  </span>
                  <h2 className={cn("text-sm font-bold truncate max-w-[200px] sm:max-w-xs", c.text)}>
                    {projectName}
                  </h2>
                  <span className={cn("text-[10px] font-mono font-bold", c.textFaint)}>
                    ID: {projectId}
                  </span>
                </div>

                <button
                  onClick={exitProject}
                  className={cn("px-3.5 py-2 border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:bg-neutral-800/10", c.border, c.textSecondary, "hover:" + c.text)}
                  id="btn_switch_project"
                >
                  <ArrowLeft size={12} />
                  Exit Project
                </button>
              </div>

              {/* Upload Dropzone */}
              <div 
                {...getRootProps()} 
                className={cn(
                  "border-2 border-dashed rounded-3xl p-10 sm:p-14 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-4 group backdrop-blur-md shadow-2xl",
                  isDragActive ? "border-[#E8A33D] bg-[#E8A33D]/5" : c.borderStrong + " " + c.surface + " hover:border-[#54D6C9]/40 hover:" + c.surfaceHi
                )}
                id="dropZone"
              >
                <input {...getInputProps()} />
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105", c.accentSoft, c.accent)}>
                  <Upload size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className={cn("text-base font-bold", c.text)}>Drop your video here</h3>
                  <p className={cn("text-xs", c.textMuted)}>or click to browse from your device</p>
                </div>

                <button 
                  type="button"
                  className={cn("mt-2 px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow transition-all", c.accentBg, c.accentInk)}
                >
                  <FileVideo size={13} />
                  Browse files
                </button>

                <div className={cn("flex items-center justify-center gap-2 mt-2 font-mono text-[10.5px]", c.textFaint)}>
                  <span>MP4</span><span className="w-1 h-1 rounded-full bg-current opacity-40"></span>
                  <span>MOV</span><span className="w-1 h-1 rounded-full bg-current opacity-40"></span>
                  <span>WEBM</span><span className="w-1 h-1 rounded-full bg-current opacity-40"></span>
                  <span>up to 4GB</span>
                </div>
              </div>

              {/* Demo Switch Trigger */}
              <button
                onClick={loadDemoVideo}
                className={cn("w-full py-3.5 border rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]", c.surface, c.border, c.textSecondary, "hover:" + c.text)}
                id="btn_load_demo_inside_project"
              >
                <Sparkles size={13} className="animate-pulse" />
                Try with Sample Demo Video
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 5. Library / Recent Projects (Dynamic representation of library) */}
      <section className="max-w-[800px] mx-auto px-6 mb-16 relative z-10">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <span className={cn("font-mono text-[10.5px] font-bold uppercase tracking-wider block mb-1", c.accent)}>
              Your library
            </span>
            <h2 className={cn("font-serif text-xl sm:text-2xl font-medium tracking-tight", c.text)}>
              Recent projects
            </h2>
          </div>
          <button 
            onClick={loadDemoVideo}
            className={cn("text-xs font-bold flex items-center gap-1 transition-colors", c.textMuted, "hover:" + c.accent2)}
          >
            View all
            <ChevronRight size={14} />
          </button>
        </div>

        <div className={cn("border rounded-2xl shadow-xl overflow-hidden", c.border, c.surface)}>
          {recentProjects.length === 0 ? (
            /* PREPOPULATED RECENT DEMOS (WHEN USER HAS ZERO RECENT PROJECTS) */
            <div className="divide-y divide-[#F5F1E8]/10">
              <div 
                onClick={loadDemoVideo}
                className={cn("flex items-center gap-4 p-4 cursor-pointer transition-colors", "hover:" + c.surfaceHi)}
              >
                <div className="relative shrink-0 w-16 h-11 rounded-lg overflow-hidden bg-gradient-to-tr from-[#5B4A2F] to-[#241A08] flex items-center justify-center text-white/90">
                  <Play size={12} fill="currentColor" />
                  <span className="absolute right-1 bottom-1 font-mono text-[8.5px] bg-black/60 px-1 rounded text-white font-semibold">
                    00:47
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h4 className={cn("text-xs sm:text-sm font-bold truncate", c.text)}>sample_reel_04.mp4</h4>
                  <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px]">
                    <span className={c.accent2}>EN → KM</span>
                    <span className={c.textFaint}>•</span>
                    <span className={c.textFaint}>2 min ago</span>
                  </div>
                </div>
                <span className={cn("shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-[#54D6C9]/13", c.accent2)}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Completed
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); loadDemoVideo(); }}
                  className={cn("p-2 rounded-lg text-neutral-500 hover:text-neutral-200 transition-colors shrink-0", "hover:" + c.surface)}
                >
                  <Download size={14} />
                </button>
              </div>

              <div 
                onClick={loadDemoVideo}
                className={cn("flex items-center gap-4 p-4 cursor-pointer transition-colors", "hover:" + c.surfaceHi)}
              >
                <div className="relative shrink-0 w-16 h-11 rounded-lg overflow-hidden bg-gradient-to-tr from-[#2F5450] to-[#12211F] flex items-center justify-center text-white/90">
                  <Play size={12} fill="currentColor" />
                  <span className="absolute right-1 bottom-1 font-mono text-[8.5px] bg-black/60 px-1 rounded text-white font-semibold">
                    03:12
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h4 className={cn("text-xs sm:text-sm font-bold truncate", c.text)}>product_launch.mov</h4>
                  <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px]">
                    <span className={c.accent2}>EN → TH</span>
                    <span className={c.textFaint}>•</span>
                    <span className={c.accent}>processing — 62%</span>
                  </div>
                </div>
                <span className={cn("shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-[#E8A33D]/13", c.accent)}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E8A33D] animate-ping" />
                  Processing
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); loadDemoVideo(); }}
                  className={cn("p-2 rounded-lg text-neutral-500 hover:text-neutral-200 transition-colors shrink-0", "hover:" + c.surface)}
                >
                  <RefreshCw size={13} className="animate-spin text-[#E8A33D]" />
                </button>
              </div>

              <div 
                onClick={loadDemoVideo}
                className={cn("flex items-center gap-4 p-4 cursor-pointer transition-colors", "hover:" + c.surfaceHi)}
              >
                <div className="relative shrink-0 w-16 h-11 rounded-lg overflow-hidden bg-gradient-to-tr from-[#4A3F5B] to-[#1D1826] flex items-center justify-center text-white/90">
                  <Play size={12} fill="currentColor" />
                  <span className="absolute right-1 bottom-1 font-mono text-[8.5px] bg-black/60 px-1 rounded text-white font-semibold">
                    12:04
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h4 className={cn("text-xs sm:text-sm font-bold truncate", c.text)}>tutorial_ep02.mp4</h4>
                  <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px]">
                    <span className={c.accent2}>EN → JA</span>
                    <span className={c.textFaint}>•</span>
                    <span className={c.textFaint}>1 day ago</span>
                  </div>
                </div>
                <span className={cn("shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-[#54D6C9]/13", c.accent2)}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Completed
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); loadDemoVideo(); }}
                  className={cn("p-2 rounded-lg text-neutral-500 hover:text-neutral-200 transition-colors shrink-0", "hover:" + c.surface)}
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          ) : (
            /* ACTIVE SAVED LIST */
            <div className="divide-y divide-[#F5F1E8]/10">
              {recentProjects.map((p) => (
                <div 
                  key={p.id}
                  className={cn("flex items-center gap-4 p-4 cursor-pointer transition-colors", "hover:" + c.surfaceHi)}
                  onClick={() => loadProject(p.id)}
                >
                  <div className="relative shrink-0 w-16 h-11 rounded-lg overflow-hidden bg-gradient-to-tr from-[#5B3A38] to-[#241412] flex items-center justify-center text-white/90">
                    <Video size={14} />
                    <span className="absolute right-1 bottom-1 font-mono text-[8.5px] bg-black/60 px-1 rounded text-white font-semibold">
                      Live
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h4 className={cn("text-xs sm:text-sm font-bold truncate", c.text)}>{p.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px]">
                      <span className={c.accent2}>{p.id}</span>
                      <span className={c.textFaint}>•</span>
                      <span className={c.textFaint}>
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span className={cn("shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-[#54D6C9]/13", c.accent2)}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Saved
                  </span>
                  
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => loadProject(p.id)}
                      className={cn("p-1.5 rounded-lg hover:text-neutral-100 shrink-0", c.textMuted)}
                      title="Open Workspace"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => deleteProject(p.id)}
                      className={cn("p-1.5 rounded-lg hover:text-red-500 shrink-0", c.textMuted)}
                      title="Delete Project"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 6. Capabilities Block */}
      <section className="max-w-[960px] mx-auto px-6 mb-20 relative z-10">
        <div className="text-center max-w-[480px] mx-auto mb-10">
          <span className={cn("font-mono text-[10.5px] font-bold uppercase tracking-wider block mb-1", c.accent)}>
            Capabilities
          </span>
          <h2 className={cn("font-serif text-2xl sm:text-3xl font-medium tracking-tight mb-3.5", c.text)}>
            Everything happens in one pass
          </h2>
          <p className={cn("text-xs sm:text-sm leading-relaxed", c.textMuted)}>
            Upload once — Vokop handles the script, the language, and the voice, then hands back a video that's ready to publish.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Card 1 */}
          <div className={cn("border rounded-2xl p-6 relative transition-all cursor-pointer hover:-translate-y-1 group", c.border, c.surface, "hover:" + c.surfaceHi)}>
            <div className="absolute top-6 right-6 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-neutral-400 hover:text-neutral-100">
              <ChevronRight size={14} />
            </div>
            <span className={cn("font-mono text-[10px] tracking-widest uppercase block mb-4", c.textFaint)}>
              01 · TRANSCRIBE
            </span>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", c.accentSoft, c.accent)}>
              <Music size={18} />
            </div>
            <h3 className={cn("text-sm sm:text-base font-bold mb-1.5", c.text)}>Speaker-timed script</h3>
            <p className={cn("text-xs leading-relaxed", c.textMuted)}>
              AI listens to the original audio and generates a precise transcript, timed to every speaker and pause.
            </p>
          </div>

          {/* Card 2 */}
          <div className={cn("border rounded-2xl p-6 relative transition-all cursor-pointer hover:-translate-y-1 group", c.border, c.surface, "hover:" + c.surfaceHi)}>
            <div className="absolute top-6 right-6 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-neutral-400 hover:text-neutral-100">
              <ChevronRight size={14} />
            </div>
            <span className={cn("font-mono text-[10px] tracking-widest uppercase block mb-4", c.textFaint)}>
              02 · TRANSLATE
            </span>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", c.accentSoft, c.accent)}>
              <Globe size={18} />
            </div>
            <h3 className={cn("text-sm sm:text-base font-bold mb-1.5", c.text)}>40+ languages</h3>
            <p className={cn("text-xs leading-relaxed", c.textMuted)}>
              The script is adapted into your target language, keeping meaning, tone, and pacing intact — not a literal word swap.
            </p>
          </div>

          {/* Card 3 (Alt accent color layout) */}
          <div className={cn("border rounded-2xl p-6 relative transition-all cursor-pointer hover:-translate-y-1 group", c.border, c.surface, "hover:" + c.surfaceHi)}>
            <div className="absolute top-6 right-6 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-neutral-400 hover:text-neutral-100">
              <ChevronRight size={14} />
            </div>
            <span className={cn("font-mono text-[10px] tracking-widest uppercase block mb-4", c.textFaint)}>
              03 · VOICEOVER
            </span>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", c.accent2Soft, c.accent2)}>
              <Video size={18} />
            </div>
            <h3 className={cn("text-sm sm:text-base font-bold mb-1.5", c.text)}>Natural AI voice</h3>
            <p className={cn("text-xs leading-relaxed", c.textMuted)}>
              A studio-grade voice is recorded, lip-timed, and mixed back into the video — ready to export in one file.
            </p>
          </div>
        </div>

        {/* 6 extra items below capabilities */}
        <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-px rounded-2xl overflow-hidden border", c.border, c.border)}>
          <div className={cn("p-4 flex items-center gap-3 text-xs font-semibold", c.surface)}>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", c.bg, c.textFaint)}>
              <Users size={13} />
            </div>
            <span className={c.textSecondary}>Speaker detection</span>
          </div>

          <div className={cn("p-4 flex items-center gap-3 text-xs font-semibold", c.surface)}>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", c.bg, c.textFaint)}>
              <Tv size={13} />
            </div>
            <span className={c.textSecondary}>Auto lip-sync</span>
          </div>

          <div className={cn("p-4 flex items-center gap-3 text-xs font-semibold", c.surface)}>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", c.bg, c.textFaint)}>
              <Upload size={13} />
            </div>
            <span className={c.textSecondary}>Batch uploads</span>
          </div>

          <div className={cn("p-4 flex items-center gap-3 text-xs font-semibold", c.surface)}>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", c.bg, c.textFaint)}>
              <Terminal size={13} />
            </div>
            <span className={c.textSecondary}>SRT / VTT export</span>
          </div>

          <div className={cn("p-4 flex items-center justify-between gap-3 text-xs font-semibold", c.surface)}>
            <div className="flex items-center gap-3">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", c.bg, "text-[#E8A33D]")}>
                <Sparkles size={13} />
              </div>
              <span className={c.textSecondary}>Up to 4K output</span>
            </div>
            <span className={cn("text-[8.5px] font-mono font-bold tracking-widest uppercase px-1.5 py-0.5 rounded border border-[#E8A33D]/20", c.accent, c.accentSoft)}>
              Pro
            </span>
          </div>

          <div className={cn("p-4 flex items-center justify-between gap-3 text-xs font-semibold", c.surface)}>
            <div className="flex items-center gap-3">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", c.bg, "text-[#E8A33D]")}>
                <Globe size={13} />
              </div>
              <span className={c.textSecondary}>API access</span>
            </div>
            <span className={cn("text-[8.5px] font-mono font-bold tracking-widest uppercase px-1.5 py-0.5 rounded border border-[#E8A33D]/20", c.accent, c.accentSoft)}>
              Pro
            </span>
          </div>
        </div>
      </section>

      {/* 7. See it in Action (Interactive Demo Swiper) */}
      <section className="max-w-[800px] mx-auto px-6 mb-20 relative z-10">
        <div className="text-center max-w-[480px] mx-auto mb-10">
          <span className={cn("font-mono text-[10.5px] font-bold uppercase tracking-wider block mb-1", c.accent)}>
            See it in action
          </span>
          <h2 className={cn("font-serif text-2xl sm:text-3xl font-medium tracking-tight mb-3", c.text)}>
            Hear the difference
          </h2>
          <p className={cn("text-xs sm:text-sm leading-relaxed", c.textMuted)}>
            The same 24-second clip, run through the pipeline in four languages. Tap to compare.
          </p>
        </div>

        <div className={cn("border rounded-3xl shadow-xl overflow-hidden", c.border, c.surface)}>
          <div className="flex flex-col">
            {/* Visual Screen Mockup */}
            <div className={cn("relative h-64 sm:h-76 flex flex-col items-center justify-center transition-all duration-300 bg-gradient-to-tr", DEMO_SLIDES[activeDemoIndex].bgGradient)}>
              
              <span className={cn("absolute top-5 left-6 font-mono text-[11px] tracking-widest uppercase flex items-center gap-2 font-bold", c.text)}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#54D6C9] animate-pulse" />
                {DEMO_SLIDES[activeDemoIndex].lang}
              </span>

              {/* Centered Audio/Video play trigger button */}
              <button 
                onClick={handleDemoPlayToggle}
                className={cn("w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 border", c.accentBg, c.accentInk, c.border)}
                title={demoPlaying ? "Pause sample audio" : "Play sample audio"}
              >
                {demoPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
              </button>

              <span className={cn("absolute right-6 bottom-5 font-mono text-[10.5px] font-semibold border px-2.5 py-1 rounded-full", c.border, c.surface)}>
                {DEMO_SLIDES[activeDemoIndex].duration}
              </span>
            </div>

            {/* Subtitle / Caption progress dashboard */}
            <div className="p-6 sm:p-8 text-left space-y-4">
              <div className={cn("h-1 w-full rounded-full overflow-hidden", c.borderStrong)}>
                <div 
                  className={cn("h-full rounded-full transition-all duration-100", c.accent2Bg)}
                  style={{ width: `${demoProgress}%` }}
                />
              </div>

              <div className="space-y-1">
                <span className={cn("font-mono text-[9.5px] font-bold tracking-widest uppercase", c.textFaint)}>
                  Caption Subtitle
                </span>
                <p className={cn("font-serif text-base sm:text-lg italic tracking-tight min-h-[50px] leading-snug", c.text)}>
                  "{DEMO_SLIDES[activeDemoIndex].caption}"
                </p>
              </div>
            </div>

            {/* Language chips below */}
            <div className={cn("flex flex-wrap items-center justify-center gap-2 p-4 border-t", c.border)}>
              {["EN", "ខ្មែរ", "ไทย", "日本語"].map((label, idx) => (
                <button
                  key={label}
                  onClick={() => handleLanguageChange(idx)}
                  className={cn(
                    "font-mono text-xs font-semibold px-4 py-2 rounded-full border transition-all cursor-pointer active:scale-95",
                    activeDemoIndex === idx 
                      ? c.accent2Bg + " " + c.accentInk + " border-transparent font-bold" 
                      : c.surface + " " + c.border + " " + c.textMuted + " hover:" + c.text
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* 8. Pricing Plans */}
      <section className="max-w-[960px] mx-auto px-6 mb-20 relative z-10">
        <div className="text-center max-w-[480px] mx-auto mb-8">
          <span className={cn("font-mono text-[10.5px] font-bold uppercase tracking-wider block mb-1", c.accent)}>
            Plans
          </span>
          <h2 className={cn("font-serif text-2xl sm:text-3xl font-medium tracking-tight mb-3.5", c.text)}>
            Room to grow with your channel
          </h2>
          <p className={cn("text-xs sm:text-sm leading-relaxed", c.textMuted)}>
            Start free, upgrade when the queue gets heavier. Every plan keeps your originals untouched.
          </p>
        </div>

        {/* Pricing Cycle Toggle Selector */}
        <div className="flex items-center justify-center gap-3.5 mb-10">
          <div className={cn("flex p-1 rounded-full border relative", c.border, c.surface)}>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer", billingCycle === 'monthly' ? (dark ? "bg-[#E8A33D] text-[#241A08]" : "bg-[#B9701A] text-white") : c.textMuted)}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer", billingCycle === 'annual' ? (dark ? "bg-[#E8A33D] text-[#241A08]" : "bg-[#B9701A] text-white") : c.textMuted)}
            >
              Annually
            </button>
          </div>
          <span className={cn("text-[10.5px] font-mono font-bold uppercase px-2 py-1 rounded-full border", c.accent, c.border, c.accentSoft)}>
            Save 20%
          </span>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          
          {/* Plan 1: Free */}
          <div className={cn("border rounded-3xl p-7 flex flex-col justify-between transition-all relative", c.border, c.surface)}>
            <div>
              <h4 className={cn("text-base font-bold mb-1.5", c.text)}>Free</h4>
              <p className={cn("text-xs leading-relaxed mb-6", c.textMuted)}>Try the pipeline, no credit card required.</p>
              
              <div className="flex items-baseline gap-1 mb-6 font-mono">
                <span className={cn("text-3xl font-serif font-medium", c.text)}>$0</span>
                <span className={cn("text-xs", c.textFaint)}>/ mo</span>
              </div>

              <button 
                onClick={loadDemoVideo}
                className={cn("w-full py-2.5 rounded-full text-xs font-bold border transition-colors cursor-pointer", c.border, c.textSecondary, "hover:" + c.accent2)}
              >
                Get Started
              </button>

              <ul className="mt-7 space-y-3.5">
                <li className="flex items-start gap-2 text-xs">
                  <Check size={14} className={cn("mt-0.5 shrink-0", c.accent2)} />
                  <span className={c.textSecondary}>3 videos per month</span>
                </li>
                <li className="flex items-start gap-2 text-xs">
                  <Check size={14} className={cn("mt-0.5 shrink-0", c.accent2)} />
                  <span className={c.textSecondary}>Up to 1080p export</span>
                </li>
                <li className="flex items-start gap-2 text-xs">
                  <Check size={14} className={cn("mt-0.5 shrink-0", c.accent2)} />
                  <span className={c.textSecondary}>2 languages per video</span>
                </li>
                <li className="flex items-start gap-2 text-xs">
                  <button 
                    onClick={triggerProFlash}
                    className="flex items-start gap-2 text-left group"
                  >
                    <X size={14} className={cn("mt-0.5 shrink-0", c.textFaint)} />
                    <span className={cn("underline decoration-dotted text-[11px] font-semibold transition-all group-hover:text-amber-500", c.textFaint)}>
                      Carries a Vokop watermark — <span className="text-[#54D6C9]">removed in Pro</span>
                    </span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Plan 2: Pro (Featured Card) */}
          <div 
            id="proCard"
            className={cn(
              "border-2 rounded-3xl p-7 flex flex-col justify-between relative transition-all duration-500", 
              flashPro ? "border-[#54D6C9] bg-[#54D6C9]/10 scale-[1.03]" : "border-[#E8A33D] bg-[#231E17]/50 dark:bg-[#231E17]/40 shadow-2xl scale-[1.01]"
            )}
          >
            <span className={cn("absolute -top-3.5 left-1/2 -translate-x-1/2 font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-1 rounded-full shadow-md", c.accentInk, c.accentBg)}>
              Most popular
            </span>

            <div>
              <h4 className={cn("text-base font-bold mb-1.5", c.text)}>Pro</h4>
              <p className={cn("text-xs leading-relaxed mb-6", c.textMuted)}>For creators publishing videos every week.</p>
              
              <div className="flex items-baseline gap-1 mb-6 font-mono">
                <span className={cn("text-3xl font-serif font-medium", c.text)}>
                  {billingCycle === 'monthly' ? '$19' : '$15'}
                </span>
                <span className={cn("text-xs", c.textFaint)}>/ mo</span>
              </div>

              <button 
                onClick={loadDemoVideo}
                className={cn("w-full py-2.5 rounded-full text-xs font-bold shadow-md transition-transform cursor-pointer hover:scale-[1.02]", c.accentBg, c.accentInk)}
              >
                Start Pro trial
              </button>

              <ul className="mt-7 space-y-3.5">
                <li className="flex items-start gap-2 text-xs">
                  <Check size={14} className={cn("mt-0.5 shrink-0", c.accent2)} />
                  <span className={c.textSecondary}>Unlimited videos</span>
                </li>
                <li className="flex items-start gap-2 text-xs">
                  <Check size={14} className={cn("mt-0.5 shrink-0", c.accent2)} />
                  <span className={c.textSecondary}>Up to 4K export</span>
                </li>
                <li className="flex items-start gap-2 text-xs">
                  <Check size={14} className={cn("mt-0.5 shrink-0", c.accent2)} />
                  <span className={c.textSecondary}>40+ languages, no watermark</span>
                </li>
                <li className="flex items-start gap-2 text-xs">
                  <Check size={14} className={cn("mt-0.5 shrink-0", c.accent2)} />
                  <span className={c.textSecondary}>Priority processing queue</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Plan 3: Studio */}
          <div className={cn("border rounded-3xl p-7 flex flex-col justify-between transition-all relative", c.border, c.surface)}>
            <div>
              <h4 className={cn("text-base font-bold mb-1.5", c.text)}>Studio</h4>
              <p className={cn("text-xs leading-relaxed mb-6", c.textMuted)}>For teams shipping content in bulk.</p>
              
              <div className="flex items-baseline gap-1 mb-6 font-mono">
                <span className={cn("text-3xl font-serif font-medium", c.text)}>
                  {billingCycle === 'monthly' ? '$49' : '$39'}
                </span>
                <span className={cn("text-xs", c.textFaint)}>/ mo</span>
              </div>

              <button 
                onClick={loadDemoVideo}
                className={cn("w-full py-2.5 rounded-full text-xs font-bold border transition-colors cursor-pointer", c.border, c.textSecondary, "hover:" + c.accent2)}
              >
                Start Studio trial
              </button>

              <ul className="mt-7 space-y-3.5">
                <li className="flex items-start gap-2 text-xs">
                  <Check size={14} className={cn("mt-0.5 shrink-0", c.accent2)} />
                  <span className={c.textSecondary}>Everything in Pro</span>
                </li>
                <li className="flex items-start gap-2 text-xs">
                  <Check size={14} className={cn("mt-0.5 shrink-0", c.accent2)} />
                  <span className={c.textSecondary}>Batch uploads & API access</span>
                </li>
                <li className="flex items-start gap-2 text-xs">
                  <Check size={14} className={cn("mt-0.5 shrink-0", c.accent2)} />
                  <span className={c.textSecondary}>Custom voice cloning</span>
                </li>
                <li className="flex items-start gap-2 text-xs">
                  <Check size={14} className={cn("mt-0.5 shrink-0", c.accent2)} />
                  <span className={c.textSecondary}>Dedicated support channel</span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      {/* 9. Side-by-Side Plan Comparison Table */}
      <section className="max-w-[960px] mx-auto px-6 mb-20 relative z-10">
        <div className="text-center max-w-[480px] mx-auto mb-10">
          <span className={cn("font-mono text-[10.5px] font-bold uppercase tracking-wider block mb-1", c.accent)}>
            Side by side
          </span>
          <h2 className={cn("font-serif text-2xl sm:text-3xl font-medium tracking-tight mb-3.5", c.text)}>
            Compare every plan in detail
          </h2>
          <p className={cn("text-xs sm:text-sm leading-relaxed", c.textMuted)}>
            Same three plans, broken down feature by feature — useful once you know roughly what you need.
          </p>
        </div>

        <div className={cn("border rounded-2xl shadow-2xl overflow-hidden", c.border, c.surface)}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[560px]">
              <thead>
                <tr className={cn("border-b text-[10.5px] uppercase font-mono tracking-widest", c.border, c.textFaint)}>
                  <th className="p-4 pl-6">Feature Specs</th>
                  <th className="p-4 text-center">Free</th>
                  <th className={cn("p-4 text-center border-x", c.border)}>Pro</th>
                  <th className="p-4 text-center">Studio</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y text-xs", c.border)}>
                <tr className="hover:bg-neutral-800/5">
                  <td className={cn("p-4 pl-6 font-semibold", c.textSecondary)}>Videos per month</td>
                  <td className={cn("p-4 text-center", c.textSecondary)}>3</td>
                  <td className={cn("p-4 text-center font-bold border-x", c.border, c.text)}>Unlimited</td>
                  <td className={cn("p-4 text-center", c.textSecondary)}>Unlimited</td>
                </tr>
                <tr className="hover:bg-neutral-800/5">
                  <td className={cn("p-4 pl-6 font-semibold", c.textSecondary)}>Export quality</td>
                  <td className={cn("p-4 text-center", c.textSecondary)}>1080p</td>
                  <td className={cn("p-4 text-center font-bold border-x", c.border, c.text)}>4K</td>
                  <td className={cn("p-4 text-center", c.textSecondary)}>4K</td>
                </tr>
                <tr className="hover:bg-neutral-800/5">
                  <td className={cn("p-4 pl-6 font-semibold", c.textSecondary)}>Languages</td>
                  <td className={cn("p-4 text-center", c.textSecondary)}>2</td>
                  <td className={cn("p-4 text-center font-bold border-x", c.border, c.text)}>40+</td>
                  <td className={cn("p-4 text-center", c.textSecondary)}>40+</td>
                </tr>
                <tr className="hover:bg-neutral-800/5">
                  <td className={cn("p-4 pl-6 font-semibold", c.textSecondary)}>Watermark</td>
                  <td className={cn("p-4 text-center", c.textSecondary)}>Yes</td>
                  <td className={cn("p-4 text-center border-x", c.border)}>
                    <X size={14} className="mx-auto text-neutral-500 opacity-60" />
                  </td>
                  <td className="p-4 text-center">
                    <X size={14} className="mx-auto text-neutral-500 opacity-60" />
                  </td>
                </tr>
                <tr className="hover:bg-neutral-800/5">
                  <td className={cn("p-4 pl-6 font-semibold", c.textSecondary)}>Priority processing</td>
                  <td className={cn("p-4 text-center text-neutral-500 font-bold")}>—</td>
                  <td className={cn("p-4 text-center border-x", c.border)}>
                    <Check size={14} className={cn("mx-auto", c.accent2)} />
                  </td>
                  <td className="p-4 text-center">
                    <Check size={14} className={cn("mx-auto", c.accent2)} />
                  </td>
                </tr>
                <tr className="hover:bg-neutral-800/5">
                  <td className={cn("p-4 pl-6 font-semibold", c.textSecondary)}>Batch uploads</td>
                  <td className={cn("p-4 text-center text-neutral-500 font-bold")}>—</td>
                  <td className={cn("p-4 text-center text-neutral-500 border-x font-bold", c.border)}>—</td>
                  <td className="p-4 text-center">
                    <Check size={14} className={cn("mx-auto", c.accent2)} />
                  </td>
                </tr>
                <tr className="hover:bg-neutral-800/5">
                  <td className={cn("p-4 pl-6 font-semibold", c.textSecondary)}>API access</td>
                  <td className={cn("p-4 text-center text-neutral-500 font-bold")}>—</td>
                  <td className={cn("p-4 text-center text-neutral-500 border-x font-bold", c.border)}>—</td>
                  <td className="p-4 text-center">
                    <Check size={14} className={cn("mx-auto", c.accent2)} />
                  </td>
                </tr>
                <tr className="hover:bg-neutral-800/5">
                  <td className={cn("p-4 pl-6 font-semibold", c.textSecondary)}>Voice cloning</td>
                  <td className={cn("p-4 text-center text-neutral-500 font-bold")}>—</td>
                  <td className={cn("p-4 text-center text-neutral-500 border-x font-bold", c.border)}>—</td>
                  <td className={cn("p-4 text-center font-bold", c.textSecondary)}>Custom</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 10. About Section (SaaS narrative context) */}
      <section className="max-w-[960px] mx-auto px-6 mb-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="space-y-4 text-left">
            <span className={cn("font-mono text-[10.5px] font-bold uppercase tracking-wider block", c.accent)}>
              About Vokop
            </span>
            <h2 className={cn("font-serif text-2xl sm:text-3xl font-medium tracking-tight leading-tight", c.text)}>
              Built for creators who don't stop at one language
            </h2>
            <p className={cn("text-xs sm:text-sm leading-relaxed", c.textMuted)}>
              Vokop started as an internal tool for dubbing short-form product videos into Khmer, Thai, and Japanese without hiring a full studio for every clip. It grew from there.
            </p>
            <p className={cn("text-xs sm:text-sm leading-relaxed", c.textMuted)}>
              The pipeline is the same one creators use today — transcribe, translate, voice over — just faster, and tuned for the languages teams actually ship in.
            </p>
          </div>

          <div className={cn("grid grid-cols-2 gap-px rounded-2xl overflow-hidden border", c.border, c.border)}>
            <div className={cn("p-6 text-left space-y-1.5", c.surface)}>
              <span className={cn("font-serif text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent", dark ? "from-[#E8A33D] to-[#54D6C9]" : "from-[#B9701A] to-[#0E8F82]")}>
                1.2M+
              </span>
              <p className={cn("text-[10.5px] font-bold tracking-wider uppercase", c.textFaint)}>
                Videos translated
              </p>
            </div>

            <div className={cn("p-6 text-left space-y-1.5", c.surface)}>
              <span className={cn("font-serif text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent", dark ? "from-[#E8A33D] to-[#54D6C9]" : "from-[#B9701A] to-[#0E8F82]")}>
                42
              </span>
              <p className={cn("text-[10.5px] font-bold tracking-wider uppercase", c.textFaint)}>
                Languages supported
              </p>
            </div>

            <div className={cn("p-6 text-left space-y-1.5", c.surface)}>
              <span className={cn("font-serif text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent", dark ? "from-[#E8A33D] to-[#54D6C9]" : "from-[#B9701A] to-[#0E8F82]")}>
                180+
              </span>
              <p className={cn("text-[10.5px] font-bold tracking-wider uppercase", c.textFaint)}>
                Countries reached
              </p>
            </div>

            <div className={cn("p-6 text-left space-y-1.5", c.surface)}>
              <span className={cn("font-serif text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent", dark ? "from-[#E8A33D] to-[#54D6C9]" : "from-[#B9701A] to-[#0E8F82]")}>
                4.8/5
              </span>
              <p className={cn("text-[10.5px] font-bold tracking-wider uppercase", c.textFaint)}>
                Average rating
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 11. Footer */}
      <footer className={cn("py-12 px-6 text-center border-t text-xs font-semibold relative z-10", c.border, c.textFaint)}>
        © 2026 Vokop. Built for creators who don't stop at one language.
      </footer>

    </div>
  );
};
