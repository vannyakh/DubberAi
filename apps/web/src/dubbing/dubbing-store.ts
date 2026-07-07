import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Segment } from "@video-voice-translator/types";

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
	sourceAssetId: string | null;
	targetLang: string;
	detectedLanguage: string | null;
	transcript: string;
	translatedText: string;
	transcriptSegments: Segment[];
	translationSegments: Segment[];
	speakerVoices: Record<string, string>;
	defaultVoice: string;

	setStatus: (status: DubbingStatus) => void;
	setError: (error: string | null) => void;
	setProgress: (progress: DubbingProgress | null) => void;
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
	reset: () => void;
}

export const useDubbingStore = create<DubbingStore>()(
	persist(
		(set) => ({
			status: "idle",
			error: null,
			progress: null,
			sourceAssetId: null,
			targetLang: "Khmer",
			detectedLanguage: null,
			transcript: "",
			translatedText: "",
			transcriptSegments: [],
			translationSegments: [],
			speakerVoices: {},
			defaultVoice: "Kore",

			setStatus: (status) => set({ status }),
			setError: (error) =>
				set({ error, status: error ? "error" : "idle" }),
			setProgress: (progress) => set({ progress }),
			setSourceAssetId: (sourceAssetId) => set({ sourceAssetId }),
			setTargetLang: (targetLang) => set({ targetLang }),
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
			reset: () =>
				set({
					status: "idle",
					error: null,
					progress: null,
					detectedLanguage: null,
					transcript: "",
					translatedText: "",
					transcriptSegments: [],
					translationSegments: [],
					speakerVoices: {},
				}),
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
