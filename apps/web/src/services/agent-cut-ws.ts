import type {
	AgentCutClipSummary,
	AgentCutPlanResult,
} from "./ai-client";

const API_BASE: string =
	(import.meta.env.VITE_API_URL as string | undefined) ??
	"http://localhost:4000";

function toWebSocketUrl(httpUrl: string): string {
	if (httpUrl.startsWith("https://")) {
		return httpUrl.replace("https://", "wss://");
	}
	if (httpUrl.startsWith("http://")) {
		return httpUrl.replace("http://", "ws://");
	}
	return httpUrl;
}

export interface AgentCutRealtimeRequest {
	sessionId: string;
	prompt: string;
	transcript: string;
	durationSeconds: number;
	minCutSeconds: number;
	paddingSeconds: number;
	clipSummaries?: AgentCutClipSummary[];
}

export interface AgentCutRealtimeHandlers {
	onStatus?: (event: { sessionId: string; stage: string; message: string }) => void;
	onResult?: (result: AgentCutPlanResult) => void;
	onError?: (message: string) => void;
}

export function runAgentCutRealtime(
	request: AgentCutRealtimeRequest,
	handlers: AgentCutRealtimeHandlers = {},
): Promise<AgentCutPlanResult> {
	const url = `${toWebSocketUrl(API_BASE)}/api/ai/agent-cut-session`;

	return new Promise((resolve, reject) => {
		const socket = new WebSocket(url);

		socket.addEventListener("open", () => {
			socket.send(
				JSON.stringify({
					type: "agent_cut_request",
					...request,
				}),
			);
		});

		socket.addEventListener("message", (event) => {
			const payload = JSON.parse(String(event.data)) as
				| { type: "status"; sessionId: string; stage: string; message: string }
				| { type: "result"; sessionId: string; result: AgentCutPlanResult }
				| { type: "error"; sessionId: string; message: string };

			if (payload.type === "status") {
				handlers.onStatus?.(payload);
				return;
			}

			if (payload.type === "error") {
				handlers.onError?.(payload.message);
				socket.close();
				reject(new Error(payload.message));
				return;
			}

			handlers.onResult?.(payload.result);
			socket.close();
			resolve(payload.result);
		});

		socket.addEventListener("error", () => {
			const message = "WebSocket connection failed";
			handlers.onError?.(message);
			reject(new Error(message));
		});
	});
}
