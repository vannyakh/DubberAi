import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SilenceRange } from "./silence";
import {
	DEFAULT_AUTOCUT_PIPELINE,
	type AutoCutPipelineConfig,
	clipKey,
} from "./config";
import type { CuttableElementRef } from "./apply-cuts";

export type AutoCutStatus =
	| "idle"
	| "analyzing"
	| "applying"
	| "done"
	| "error";

export interface AutoCutPipelineProgress {
	current: number;
	total: number;
}

export type AutoCutViewMode = "autocut" | "agentcut";

export interface AgentCutMessage {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
	createdAt?: number;
}

export type AgentCutIntent =
	| "autocut"
	| "trim-dialogue"
	| "remove-pauses"
	| "story-tighten"
	| "audio-cleanup"
	| "text-timing"
	| "footage-selection"
	| "external-source"
	| "unknown";

export interface AgentCutAction {
	type:
		| "cut"
		| "trim"
		| "audio"
		| "text"
		| "footage"
		| "external_source";
	label: string;
	reason?: string;
	payload?: unknown;
}

export interface AgentCutPlan {
	intent: AgentCutIntent;
	summary: string;
	status: "planned" | "needs_clarification";
	cuts: SilenceRange[];
	actions: AgentCutAction[];
	questions: string[];
}

export interface AgentChatSession {
	id: string;
	title: string;
	updatedAt: number;
	messages: AgentCutMessage[];
	intent: AgentCutIntent | null;
	plan: AgentCutPlan | null;
	actions: AgentCutAction[];
}

interface AutoCutStore {
	status: AutoCutStatus;
	error: string | null;
	activeMode: AutoCutViewMode;
	pipeline: AutoCutPipelineConfig;
	enabledClips: Record<string, boolean>;
	analysisSourceKey: string | null;
	silences: SilenceRange[];
	analyzedDurationSeconds: number;
	agentSessionId: string;
	agentSessionHistory: AgentChatSession[];
	agentPrompt: string;
	agentMessages: AgentCutMessage[];
	agentIntent: AgentCutIntent | null;
	agentPlan: AgentCutPlan | null;
	agentActions: AgentCutAction[];
	/** Active pipeline step labels for the full-screen loader. */
	pipelineSteps: string[];
	pipelineStepIndex: number;
	pipelineProgress: AutoCutPipelineProgress | null;

	setStatus: (status: AutoCutStatus) => void;
	setError: (error: string | null) => void;
	setActiveMode: (mode: AutoCutViewMode) => void;
	setPipeline: (partial: Partial<AutoCutPipelineConfig>) => void;
	setAnalysisSourceKey: (key: string | null) => void;
	toggleClip: (key: string, enabled: boolean) => void;
	setCategoryClips: (keys: string[], enabled: boolean) => void;
	setAgentPrompt: (prompt: string) => void;
	startAgentSession: () => string;
	openAgentSession: (sessionId: string) => void;
	pushAgentMessage: (message: AgentCutMessage) => void;
	setAgentPlan: (plan: AgentCutPlan | null) => void;
	clearAgentSession: () => void;
	setDetection: (params: {
		silences: SilenceRange[];
		analyzedDurationSeconds: number;
	}) => void;
	beginPipeline: (steps: string[]) => void;
	setPipelineStep: (stepIndex: number, progress?: AutoCutPipelineProgress | null) => void;
	clearPipeline: () => void;
	reset: () => void;
}

const IDLE_PIPELINE = {
	pipelineSteps: [] as string[],
	pipelineStepIndex: -1,
	pipelineProgress: null as AutoCutPipelineProgress | null,
};

function createSessionId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyAgentSession(): AgentChatSession {
	return {
		id: createSessionId(),
		title: "New chat",
		updatedAt: Date.now(),
		messages: [],
		intent: null,
		plan: null,
		actions: [],
	};
}

function deriveSessionTitle(messages: AgentCutMessage[]): string {
	const firstUser = messages.find((message) => message.role === "user")?.content?.trim();
	if (!firstUser) return "New chat";
	return firstUser.length > 48 ? `${firstUser.slice(0, 48)}...` : firstUser;
}

function upsertSession({
	sessionId,
	sessions,
	messages,
	intent,
	plan,
	actions,
}: {
	sessionId: string;
	sessions: AgentChatSession[];
	messages: AgentCutMessage[];
	intent: AgentCutIntent | null;
	plan: AgentCutPlan | null;
	actions: AgentCutAction[];
}): AgentChatSession[] {
	const nextSession: AgentChatSession = {
		id: sessionId,
		title: deriveSessionTitle(messages),
		updatedAt: Date.now(),
		messages,
		intent,
		plan,
		actions,
	};
	const otherSessions = sessions.filter((session) => session.id !== sessionId);
	return [nextSession, ...otherSessions].sort((a, b) => b.updatedAt - a.updatedAt);
}

export const useAutoCutStore = create<AutoCutStore>()(
	persist(
		(set) => {
			const initialSession = createEmptyAgentSession();
			return {
			status: "idle",
			error: null,
			activeMode: "autocut",
			pipeline: DEFAULT_AUTOCUT_PIPELINE,
			enabledClips: {},
			analysisSourceKey: null,
			silences: [],
			analyzedDurationSeconds: 0,
			agentSessionId: initialSession.id,
			agentSessionHistory: [initialSession],
			agentPrompt: "",
			agentMessages: [],
			agentIntent: null,
			agentPlan: null,
			agentActions: [],
			...IDLE_PIPELINE,

			setStatus: (status) => set({ status }),
			setError: (error) =>
				set({ error, status: error ? "error" : "idle", ...IDLE_PIPELINE }),
			setActiveMode: (activeMode) => set({ activeMode }),
			setPipeline: (partial) =>
				set((state) => ({
					pipeline: { ...state.pipeline, ...partial },
					silences: [],
					status: "idle",
					...IDLE_PIPELINE,
				})),
			setAnalysisSourceKey: (analysisSourceKey) =>
				set({
					analysisSourceKey,
					silences: [],
					status: "idle",
					error: null,
					...IDLE_PIPELINE,
				}),
			toggleClip: (key, enabled) =>
				set((state) => ({
					enabledClips: { ...state.enabledClips, [key]: enabled },
					silences: [],
					status: "idle",
					...IDLE_PIPELINE,
				})),
			setCategoryClips: (keys, enabled) =>
				set((state) => {
					const enabledClips = { ...state.enabledClips };
					for (const key of keys) {
						enabledClips[key] = enabled;
					}
					return {
						enabledClips,
						silences: [],
						status: "idle",
						...IDLE_PIPELINE,
					};
				}),
			setAgentPrompt: (agentPrompt) => set({ agentPrompt }),
			startAgentSession: () => {
				const session = createEmptyAgentSession();
				set((state) => ({
					agentSessionId: session.id,
					agentSessionHistory: [session, ...state.agentSessionHistory],
					agentPrompt: "",
					agentMessages: [],
					agentIntent: null,
					agentPlan: null,
					agentActions: [],
				}));
				return session.id;
			},
			openAgentSession: (sessionId) =>
				set((state) => {
					const session = state.agentSessionHistory.find((item) => item.id === sessionId);
					if (!session) return {};
					return {
						agentSessionId: session.id,
						agentPrompt: "",
						agentMessages: session.messages,
						agentIntent: session.intent,
						agentPlan: session.plan,
						agentActions: session.actions,
					};
				}),
			pushAgentMessage: (message) =>
				set((state) => ({
					agentMessages: [...state.agentMessages, message],
					agentSessionHistory: upsertSession({
						sessionId: state.agentSessionId,
						sessions: state.agentSessionHistory,
						messages: [...state.agentMessages, message],
						intent: state.agentIntent,
						plan: state.agentPlan,
						actions: state.agentActions,
					}),
				})),
			setAgentPlan: (agentPlan) =>
				set((state) => {
					const agentIntent = agentPlan?.intent ?? null;
					const agentActions = agentPlan?.actions ?? [];
					return {
						agentPlan,
						agentIntent,
						agentActions,
						agentSessionHistory: upsertSession({
							sessionId: state.agentSessionId,
							sessions: state.agentSessionHistory,
							messages: state.agentMessages,
							intent: agentIntent,
							plan: agentPlan,
							actions: agentActions,
						}),
					};
				}),
			clearAgentSession: () =>
				set((state) => {
					const session = createEmptyAgentSession();
					return {
						agentSessionId: session.id,
						agentSessionHistory: [session, ...state.agentSessionHistory],
						agentPrompt: "",
						agentMessages: [],
						agentIntent: null,
						agentPlan: null,
						agentActions: [],
					};
				}),
			setDetection: ({ silences, analyzedDurationSeconds }) =>
				set({ silences, analyzedDurationSeconds }),
			beginPipeline: (pipelineSteps) =>
				set({
					pipelineSteps,
					pipelineStepIndex: 0,
					pipelineProgress: null,
					error: null,
				}),
			setPipelineStep: (pipelineStepIndex, pipelineProgress = null) =>
				set({ pipelineStepIndex, pipelineProgress }),
			clearPipeline: () => set(IDLE_PIPELINE),
			reset: () =>
				set(() => {
					const session = createEmptyAgentSession();
					return {
					status: "idle",
					error: null,
					activeMode: "autocut",
					enabledClips: {},
					analysisSourceKey: null,
					silences: [],
					analyzedDurationSeconds: 0,
					agentSessionId: session.id,
					agentSessionHistory: [session],
					agentPrompt: "",
					agentMessages: [],
					agentIntent: null,
					agentPlan: null,
					agentActions: [],
					...IDLE_PIPELINE,
					};
				}),
			};
		},
		{
			name: "autocut-panel",
			partialize: (state) => ({
				activeMode: state.activeMode,
				pipeline: state.pipeline,
				enabledClips: state.enabledClips,
				agentSessionId: state.agentSessionId,
				agentSessionHistory: state.agentSessionHistory,
				agentPrompt: state.agentPrompt,
				agentMessages: state.agentMessages,
				agentIntent: state.agentIntent,
				agentPlan: state.agentPlan,
				agentActions: state.agentActions,
			}),
		},
	),
);

export function isAutoCutBusy(status: AutoCutStatus): boolean {
	return status === "analyzing" || status === "applying";
}

/** Legacy helper — primary analysis target from store keys. */
export function resolveAnalysisTarget(
	analysisSourceKey: string | null,
): CuttableElementRef | null {
	if (!analysisSourceKey) return null;
	const [trackId, elementId] = analysisSourceKey.split(":");
	if (!trackId || !elementId) return null;
	return { trackId, elementId };
}

export { clipKey };
