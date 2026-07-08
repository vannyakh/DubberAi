import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
	DEFAULT_TARGET_LANGUAGE,
	DEFAULT_UI_LOCALE,
} from "@dubbercut/utils";

interface LanguagePreferencesStore {
	targetLanguage: string;
	uiLocale: string;
	setTargetLanguage: (language: string) => void;
	setUiLocale: (locale: string) => void;
}

export const useLanguagePreferencesStore = create<LanguagePreferencesStore>()(
	persist(
		(set) => ({
			targetLanguage: DEFAULT_TARGET_LANGUAGE,
			uiLocale: DEFAULT_UI_LOCALE,
			setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
			setUiLocale: (uiLocale) => set({ uiLocale }),
		}),
		{
			name: "dubbercut-language-prefs",
			partialize: (state) => ({
				targetLanguage: state.targetLanguage,
				uiLocale: state.uiLocale,
			}),
		},
	),
);

/** Read persisted target language outside React (store init, AI calls). */
export function getPersistedTargetLanguage(): string {
	if (typeof window === "undefined") return DEFAULT_TARGET_LANGUAGE;
	try {
		const raw = localStorage.getItem("dubbercut-language-prefs");
		if (!raw) return DEFAULT_TARGET_LANGUAGE;
		const parsed = JSON.parse(raw) as { state?: { targetLanguage?: string } };
		return parsed.state?.targetLanguage ?? DEFAULT_TARGET_LANGUAGE;
	} catch {
		return DEFAULT_TARGET_LANGUAGE;
	}
}
