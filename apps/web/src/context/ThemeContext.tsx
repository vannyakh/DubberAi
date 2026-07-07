/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from "react";

interface ThemeContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("vokop_theme");
    return (saved as "light" | "dark") || "dark"; // Default to dark theme for premium studio editor look
  });

  useEffect(() => {
    localStorage.setItem("vokop_theme", theme);
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

/**
 * OpenCut-style palette (ported from OpenCut deploy branch):
 * dark bg hsl(0 0% 5%), panels hsl(0 0% 10%), accent hsl(0 0% 15%),
 * borders hsl(0 0% 16-18%), primary blue hsl(200 90% 52%).
 */
export function useThemeClasses() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return {
    dark,
    panelBg: dark ? "bg-[#1a1a1a]" : "bg-[#f8fafb]",
    pageBg: dark ? "bg-[#0d0d0d]" : "bg-[#ffffff]",
    borderB: dark ? "border-[#2e2e2e]" : "border-[#dedede]",
    borderSubtle: dark ? "border-[#292929]" : "border-[#e8e8e8]",
    borderStrong: dark ? "border-neutral-700" : "border-neutral-300",
    textPrimary: dark ? "text-[#dedede]" : "text-[#1c1c1c]",
    textSecondary: dark ? "text-[#b3b3b3]" : "text-[#404040]",
    textMuted: dark ? "text-[#808080]" : "text-[#808080]",
    textFaint: dark ? "text-[#808080]/70" : "text-[#808080]/70",
    accent: "text-[#1c9ff0]",
    accentBg: "bg-[#1c9ff0]",
    accentInk: "text-white",
    accent2: dark ? "text-[#38bdf8]" : "text-[#0284c7]",
    accent2Bg: dark ? "bg-[#38bdf8]" : "bg-[#0284c7]",
    accentSoft: "bg-[#1c9ff0]/12",
    accent2Soft: "bg-[#38bdf8]/10",
    hoverBg: dark ? "hover:bg-[#262626]" : "hover:bg-[#ededed]",
    inputBg: dark ? "bg-[#262626]" : "bg-[#ffffff]",
    subtleBg: dark ? "bg-[#262626]" : "bg-[#efefef]",
    activeBg: dark ? "bg-[#f0f0f0]" : "bg-[#1c1c1c]",
    activeText: dark ? "text-[#171717]" : "text-[#ffffff]",
    gridLine: dark ? "rgba(245,245,245,0.05)" : "rgba(23,23,23,0.06)",
  };
}
