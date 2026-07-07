import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
	DEFAULT_AUTOCUT_OPTIONS,
	type AutoCutOptions,
	type SilenceRange,
} from "./silence";
import type { CuttableElementRef } from "./apply-cuts";

export type AutoCutStatus =
	| "idle"
	| "analyzing"
	| "applying"
	| "done"
	| "error";

interface AutoCutStore {
	status: AutoCutStatus;
	error: string | null;
	options: AutoCutOptions;
	target: CuttableElementRef | null;
	silences: SilenceRange[];
	/** Duration in seconds of the analyzed source media. */
	analyzedDurationSeconds: number;

	setStatus: (status: AutoCutStatus) => void;
	setError: (error: string | null) => void;
	setOptions: (options: Partial<AutoCutOptions>) => void;
	setTarget: (target: CuttableElementRef | null) => void;
	setDetection: (params: {
		silences: SilenceRange[];
		analyzedDurationSeconds: number;
	}) => void;
	reset: () => void;
}

export const useAutoCutStore = create<AutoCutStore>()(
	persist(
		(set) => ({
			status: "idle",
			error: null,
			options: DEFAULT_AUTOCUT_OPTIONS,
			target: null,
			silences: [],
			analyzedDurationSeconds: 0,

			setStatus: (status) => set({ status }),
			setError: (error) => set({ error, status: error ? "error" : "idle" }),
			setOptions: (options) =>
				set((state) => ({
					options: { ...state.options, ...options },
					// Detection results depend on the options they were computed with.
					silences: [],
					status: "idle",
				})),
			setTarget: (target) =>
				set({ target, silences: [], status: "idle", error: null }),
			setDetection: ({ silences, analyzedDurationSeconds }) =>
				set({ silences, analyzedDurationSeconds }),
			reset: () =>
				set({
					status: "idle",
					error: null,
					target: null,
					silences: [],
					analyzedDurationSeconds: 0,
				}),
		}),
		{
			name: "autocut-panel",
			partialize: (state) => ({ options: state.options }),
		},
	),
);
