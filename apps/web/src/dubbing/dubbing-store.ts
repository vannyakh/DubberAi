import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Segment, SpeakerVocalProfile } from "@dubbercut/types";
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

/**
 * Saved character voice (like a cast member in Google Flow): voice id plus
 * the vocal style profile, reusable across videos and sessions. Presets are
 * auto-applied when a transcript speaker matches the saved character name.
 */
export interface CharacterVoicePreset {
	name: string;
	voice: string;
	profile: Omit<SpeakerVocalProfile, "speaker"> | null;
	savedAt: number;
}

function presetKey(name: string): string {
	return name.trim().toLowerCase();
}

interface DubbingStore {
	status: DubbingStatus;
	error: string | null;
	progress: DubbingProgress | null;
	/** Soft progress 0–100 for the loading orb (transcription stages + TTS). */
	overlayPercent: number;
	sourceAssetId: string | null;
	/** Spoken language of the source audio ("auto" = detect). */
	sourceLang: string;
	targetLang: string;
	detectedLanguage: string | null;
	transcript: string;
	translatedText: string;
	transcriptSegments: Segment[];
	translationSegments: Segment[];
	speakerVoices: Record<string, string>;
	/** Auto-detected gender + default feeling per speaker. */
	speakerProfiles: Record<string, SpeakerVocalProfile>;
	defaultVoice: string;
	/** Saved character voices, keyed by lowercase character name. */
	voicePresets: Record<string, CharacterVoicePreset>;
	abortController: AbortController | null;

	setStatus: (status: DubbingStatus) => void;
	setError: (error: string | null) => void;
	setProgress: (progress: DubbingProgress | null) => void;
	setOverlayPercent: (percent: number) => void;
	setSourceAssetId: (id: string | null) => void;
	setSourceLang: (lang: string) => void;
	setTargetLang: (lang: string) => void;
	setTranscription: (params: {
		transcript: string;
		segments: Segment[];
		detectedLanguage: string | null;
	}) => void;
	setTranslation: (params: { text: string; segments: Segment[] }) => void;
	setSpeakerVoice: (speaker: string, voice: string) => void;
	setSpeakerProfiles: (profiles: SpeakerVocalProfile[]) => void;
	setDefaultVoice: (voice: string) => void;
	saveVoicePreset: (preset: {
		name: string;
		voice: string;
		profile?: SpeakerVocalProfile | null;
	}) => void;
	deleteVoicePreset: (name: string) => void;
	/** Assign a saved character voice + style to a transcript speaker. */
	applyVoicePreset: (speaker: string, presetName: string) => void;
	getVoicePreset: (name: string) => CharacterVoicePreset | undefined;
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
			sourceLang: "auto",
			targetLang: getPersistedTargetLanguage(),
			detectedLanguage: null,
			transcript: "",
			translatedText: "",
			transcriptSegments: [],
			translationSegments: [],
			speakerVoices: {},
			speakerProfiles: {},
			defaultVoice: "Kore",
			voicePresets: {},
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
			setSourceLang: (sourceLang) => set({ sourceLang }),
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
			setSpeakerProfiles: (profiles) =>
				set({
					speakerProfiles: Object.fromEntries(
						profiles.map((profile) => [profile.speaker, profile]),
					),
				}),
			setDefaultVoice: (defaultVoice) => set({ defaultVoice }),
			saveVoicePreset: ({ name, voice, profile }) => {
				const trimmed = name.trim();
				if (!trimmed) return;
				const preset: CharacterVoicePreset = {
					name: trimmed,
					voice,
					profile: profile
						? {
								gender: profile.gender,
								defaultFeeling: profile.defaultFeeling,
								persona: profile.persona,
								voiceTone: profile.voiceTone,
								pace: profile.pace,
								age: profile.age,
							}
						: null,
					savedAt: Date.now(),
				};
				set((state) => ({
					voicePresets: {
						...state.voicePresets,
						[presetKey(trimmed)]: preset,
					},
				}));
			},
			deleteVoicePreset: (name) =>
				set((state) => {
					const next = { ...state.voicePresets };
					delete next[presetKey(name)];
					return { voicePresets: next };
				}),
			applyVoicePreset: (speaker, presetName) => {
				const preset = get().voicePresets[presetKey(presetName)];
				if (!preset) return;
				set((state) => ({
					speakerVoices: {
						...state.speakerVoices,
						[speaker]: preset.voice,
					},
					speakerProfiles: preset.profile
						? {
								...state.speakerProfiles,
								[speaker]: { speaker, ...preset.profile },
							}
						: state.speakerProfiles,
				}));
			},
			getVoicePreset: (name) => get().voicePresets[presetKey(name)],
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
					speakerProfiles: {},
				});
			},
		}),
		{
			name: "dubbing-panel",
			partialize: (state) => ({
				targetLang: state.targetLang,
				sourceLang: state.sourceLang,
				defaultVoice: state.defaultVoice,
				voicePresets: state.voicePresets,
			}),
		},
	),
);
