import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Segment } from "@dubbercut/types";
import {
	getPersistedTargetLanguage,
	useLanguagePreferencesStore,
} from "@/preferences/language-preferences-store";

export type DubbingStatus =
	| "idle"
	| "transcribing"
	| "translating"
	| "speaking"
	| "applying"
	| "done"
	| "error";

export interface DubbingProgress {
	current: number;
	total: number;
}

interface DubbingStore {
	status: DubbingStatus;
	error: string | null;
	progress: DubbingProgress | null;
	/** Soft progress 0–100 for the loading orb (transcription stages + TTS). */
	overlayPercent: number;
	sourceAssetId: string | null;
	targetLang: string;
	detectedLanguage: string | null;
	transcript: string;
	translatedText: string;
	transcriptSegments: Segment[];
	translationSegments: Segment[];
	speakerVoices: Record<string, string>;
	defaultVoice: string;
	abortController: AbortController | null;

	setStatus: (status: DubbingStatus) => void;
	setError: (error: string | null) => void;
	setProgress: (progress: DubbingProgress | null) => void;
	setOverlayPercent: (percent: number) => void;
	setSourceAssetId: (id: string | null) => void;
	setTargetLang: (lang: string) => void;
	setTranscription: (params: {
		transcript: string;
		segments: Segment[];
		detectedLanguage: string | null;
	}) => void;
	setTranslation: (params: { text: string; segments: Segment[] }) => void;
	setSpeakerVoice: (speaker: string, voice: string) => void;
	setDefaultVoice: (voice: string) => void;
	beginJob: () => AbortSignal;
	cancelJob: () => void;
	clearJob: () => void;
	reset: () => void;
}

export function isDubbingBusy(status: DubbingStatus): boolean {
	return (
		status === "transcribing" ||
		status === "translating" ||
		status === "speaking" ||
		status === "applying"
	);
}

export const useDubbingStore = create<DubbingStore>()(
	persist(
		(set, get) => ({
			status: "idle",
			error: null,
			progress: null,
			overlayPercent: 0,
			sourceAssetId: null,
			targetLang: getPersistedTargetLanguage(),
			detectedLanguage: null,
			transcript: "",
			translatedText: "",
			transcriptSegments: [],
			translationSegments: [],
			speakerVoices: {},
			defaultVoice: "Kore",
			abortController: null,

			setStatus: (status) => set({ status }),
			setError: (error) =>
				set({ error, status: error ? "error" : "idle", overlayPercent: 0 }),
			setProgress: (progress) => set({ progress }),
			setOverlayPercent: (percent) =>
				set({
					overlayPercent: Math.max(0, Math.min(100, Math.round(percent))),
				}),
			setSourceAssetId: (sourceAssetId) => set({ sourceAssetId }),
			setTargetLang: (targetLang) => {
				set({ targetLang });
				useLanguagePreferencesStore.getState().setTargetLanguage(targetLang);
			},
			setTranscription: ({ transcript, segments, detectedLanguage }) =>
				set({
					transcript,
					transcriptSegments: segments,
					detectedLanguage,
				}),
			setTranslation: ({ text, segments }) =>
				set({ translatedText: text, translationSegments: segments }),
			setSpeakerVoice: (speaker, voice) =>
				set((state) => ({
					speakerVoices: { ...state.speakerVoices, [speaker]: voice },
				})),
			setDefaultVoice: (defaultVoice) => set({ defaultVoice }),
			beginJob: () => {
				get().abortController?.abort();
				const abortController = new AbortController();
				set({
					abortController,
					error: null,
					progress: null,
					overlayPercent: 0,
				});
				return abortController.signal;
			},
			cancelJob: () => {
				get().abortController?.abort();
				set({
					abortController: null,
					status: "idle",
					progress: null,
					overlayPercent: 0,
					error: null,
				});
			},
			clearJob: () =>
				set({
					abortController: null,
					progress: null,
					overlayPercent: 0,
				}),
			reset: () => {
				get().abortController?.abort();
				set({
					status: "idle",
					error: null,
					progress: null,
					overlayPercent: 0,
					abortController: null,
					detectedLanguage: null,
					transcript: "",
					translatedText: "",
					transcriptSegments: [],
					translationSegments: [],
					speakerVoices: {},
				});
			},
		}),
		{
			name: "dubbing-panel",
			partialize: (state) => ({
				targetLang: state.targetLang,
				defaultVoice: state.defaultVoice,
			}),
		},
	),
);
