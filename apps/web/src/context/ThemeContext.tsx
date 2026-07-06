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

export function useThemeClasses() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return {
    dark,
    panelBg: dark ? "bg-[#171717]" : "bg-[#FFFFFF]",
    pageBg: dark ? "bg-[#0A0A0A]" : "bg-[#FAFAFA]",
    borderB: dark ? "border-[#262626]" : "border-[#E5E5E5]",
    borderSubtle: dark ? "border-[#262626]" : "border-[#E5E5E5]",
    borderStrong: dark ? "border-neutral-700" : "border-neutral-300",
    textPrimary: dark ? "text-[#F5F5F5]" : "text-[#171717]",
    textSecondary: dark ? "text-[#D4D4D4]" : "text-[#404040]",
    textMuted: dark ? "text-[#737373]" : "text-[#A3A3A3]",
    textFaint: dark ? "text-[#737373]/70" : "text-[#A3A3A3]/70",
    accent: "text-[#F2A341]",
    accentBg: "bg-[#F2A341]",
    accentInk: "text-[#171717]",
    accent2: "text-[#2DD4BF]",
    accent2Bg: "bg-[#2DD4BF]",
    accentSoft: "bg-[#F2A341]/10",
    accent2Soft: "bg-[#2DD4BF]/10",
    hoverBg: dark ? "hover:bg-[#262626]" : "hover:bg-[#F5F5F5]",
    inputBg: dark ? "bg-[#262626]" : "bg-[#FFFFFF]",
    subtleBg: dark ? "bg-[#262626]" : "bg-[#F5F5F5]",
    activeBg: dark ? "bg-[#F5F5F5]" : "bg-[#171717]",
    activeText: dark ? "text-[#171717]" : "text-[#FFFFFF]",
    gridLine: dark ? "rgba(245,245,245,0.05)" : "rgba(23,23,23,0.06)",
  };
}
