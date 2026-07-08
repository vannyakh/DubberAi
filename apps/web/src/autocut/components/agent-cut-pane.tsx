import { useMemo, useState } from "react";
import { History, PenSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { EditorCore } from "@/core";
import { runAgentCutPlan, runApplyCuts } from "../run-autocut";
import { useAutoCutStore } from "../autocut-store";
import { totalSilenceSeconds } from "../silence";
import { listCuttableClips } from "../track-list";

function formatSeconds(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return m > 0 ? `${m}m ${s.toFixed(1)}s` : `${s.toFixed(1)}s`;
}

function formatPayload(payload: unknown): string | null {
	if (payload == null) return null;
	if (typeof payload === "string") return payload;
	try {
		return JSON.stringify(payload, null, 2);
	} catch {
		return String(payload);
	}
}

export function AgentCutPane({
	editor,
	isWorking,
}: {
	editor: EditorCore;
	isWorking: boolean;
}) {
	const {
		agentSessionId,
		agentSessionHistory,
		agentPrompt,
		setAgentPrompt,
		agentMessages,
		agentPlan,
		agentActions,
		clearAgentSession,
		openAgentSession,
		silences,
		analyzedDurationSeconds,
		enabledClips,
		agentIntent,
	} = useAutoCutStore();
	const [busy, setBusy] = useState(false);
	const [historyOpen, setHistoryOpen] = useState(false);

	const enabledCount = useMemo(
		() =>
			listCuttableClips({ editor }).filter((clip) => enabledClips[clip.key]).length,
		[editor, enabledClips],
	);
	const removableSeconds = totalSilenceSeconds({ silences });

	const visibleSessions = useMemo(
		() => agentSessionHistory.filter((session) => session.messages.length > 0 || session.plan),
		[agentSessionHistory],
	);

	const handleUseQuestion = (question: string) => {
		const template = `${question}\nAnswer: `;
		const trimmedPrompt = agentPrompt.trim();
		if (!trimmedPrompt) {
			setAgentPrompt(template);
			return;
		}
		if (trimmedPrompt.includes(question)) return;
		setAgentPrompt(`${trimmedPrompt}\n\n${template}`);
	};

	const handleRun = async () => {
		if (!agentPrompt.trim()) {
			toast.error("Describe what you want the agent to do");
			return;
		}
		setBusy(true);
		try {
			const result = await runAgentCutPlan({
				editor,
				prompt: agentPrompt.trim(),
			});
			if (result.cuts.length === 0 && result.actions.length === 0) {
				toast.info("The agent returned no editable actions");
			}
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Agent Cut request failed",
			);
		} finally {
			setBusy(false);
		}
	};

	const handleApply = async () => {
		setBusy(true);
		try {
			const result = await runApplyCuts({ editor });
			if (result) {
				toast.success(
					`Cut ${formatSeconds(result.removedSeconds)} across ${result.segmentCount} segments`,
				);
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Apply cuts failed");
		} finally {
			setBusy(false);
		}
	};

	const handleNewChat = () => {
		clearAgentSession();
		setHistoryOpen(false);
	};

	const handleOpenSession = (sessionId: string) => {
		openAgentSession(sessionId);
		setHistoryOpen(false);
	};

	const formatSessionTime = (updatedAt: number) =>
		new Intl.DateTimeFormat(undefined, {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		}).format(updatedAt);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-3">
				<div className="flex items-center justify-end gap-2">
					<Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
						<SheetTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="rounded-full border bg-background/70"
								aria-label="Open chat history"
							>
								<History className="size-4" />
							</Button>
						</SheetTrigger>
						<SheetContent side="left" className="w-[320px] p-0 sm:max-w-[320px]">
							<SheetHeader className="border-b px-4 py-4">
								<div className="flex items-center justify-between gap-2 pr-8">
									<div>
										<SheetTitle className="text-base">Chat History</SheetTitle>
										<SheetDescription className="text-[11px]">
											Reopen earlier Agent Cut sessions.
										</SheetDescription>
									</div>
									<Button size="sm" variant="ghost" onClick={handleNewChat}>
										New
									</Button>
								</div>
							</SheetHeader>
							<div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
								{visibleSessions.length > 0 ? (
									visibleSessions.map((session) => (
										<button
											key={session.id}
											type="button"
											onClick={() => handleOpenSession(session.id)}
											className={`rounded-lg px-3 py-2 text-left transition-colors ${
												session.id === agentSessionId
													? "bg-foreground/8"
													: "hover:bg-foreground/5"
											}`}
										>
											<p className="truncate text-xs font-medium">
												{session.title}
											</p>
											<p className="text-muted-foreground mt-1 text-[10px]">
												{formatSessionTime(session.updatedAt)}
											</p>
										</button>
									))
								) : (
									<p className="text-muted-foreground px-2 py-3 text-xs">
										Your recent Agent Cut chats will appear here.
									</p>
								)}
							</div>
						</SheetContent>
					</Sheet>
					<Button
						variant="ghost"
						size="icon"
						className="rounded-full border bg-background/70"
						onClick={handleNewChat}
						disabled={busy || isWorking}
						aria-label="Start new chat"
					>
						<PenSquare className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="rounded-full border bg-background/70"
						onClick={clearAgentSession}
						disabled={busy || isWorking}
						aria-label="Clear chat session"
					>
						<Trash2 className="size-4" />
					</Button>
				</div>

				{agentMessages.length > 0 ? (
					agentMessages.map((message) => (
						<div
							key={message.id}
							className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
						>
							<div
								className={`max-w-[90%] rounded-2xl px-3 py-2 ${
									message.role === "user"
										? "bg-primary text-primary-foreground rounded-br-md"
										: "bg-transparent rounded-bl-md px-1 py-0"
								}`}
							>
								{message.role !== "user" ? (
									<p className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wide">
										Agent
									</p>
								) : null}
								<p
									className={`whitespace-pre-wrap text-xs leading-snug ${
										message.role === "user" ? "" : "text-sm text-foreground"
									}`}
								>
									{message.content}
								</p>
							</div>
						</div>
					))
				) : (
					<div className="flex flex-1 items-center justify-center">
						<div className="max-w-sm text-center">
							<p className="text-sm font-medium">Start the conversation</p>
							<p className="text-muted-foreground mt-1 text-xs leading-snug">
								Ask for cuts, cleanup, pacing changes, audio edits, or footage
								ideas.
							</p>
						</div>
					</div>
				)}

				{agentPlan ? (
					<div className="space-y-3 px-1">
						<div className="px-1 py-1">
							<p className="text-xs font-medium text-orange-300/90">
								{agentPlan.status === "needs_clarification"
									? "Claude has some questions ->"
									: "Claude has a plan ready ->"}
							</p>
						</div>

						<p className="px-1 text-sm leading-snug">{agentPlan.summary}</p>

						{agentPlan.questions.length > 0 ? (
							<div className="mt-3 flex flex-wrap gap-2 px-1">
								{agentPlan.questions.map((question, index) => (
									<button
										key={`${question}-${index}`}
										type="button"
										className="rounded-full border bg-foreground/5 px-3 py-1.5 text-left transition-colors hover:bg-foreground/10"
										onClick={() => handleUseQuestion(question)}
										disabled={busy || isWorking}
									>
										<span className="text-xs leading-snug">{question}</span>
									</button>
								))}
							</div>
						) : null}

						{agentPlan.status === "planned" ? (
							<div className="px-1 text-xs leading-relaxed text-muted-foreground">
								<span className="font-medium">{silences.length}</span> cut ranges -{" "}
								<span className="font-medium">
									{formatSeconds(removableSeconds)}
								</span>{" "}
								of {formatSeconds(analyzedDurationSeconds)} removable
							</div>
						) : null}

						{agentActions.length > 0 ? (
							<div className="flex flex-col gap-2 px-1">
								{agentActions.map((action, index) => {
									const payloadText = formatPayload(action.payload);
									return (
										<div
											key={`${action.type}-${index}`}
											className="border-l border-foreground/10 pl-3"
										>
											<div className="flex items-center justify-between gap-2">
												<p className="text-xs font-medium">{action.label}</p>
											</div>
											{action.reason ? (
												<p className="text-muted-foreground mt-1 text-[11px] leading-snug">
													{action.reason}
												</p>
											) : null}
											{payloadText ? (
												<pre className="mt-2 overflow-x-auto rounded-lg bg-foreground/5 p-2 text-[10px] leading-relaxed text-muted-foreground">
													{payloadText}
												</pre>
											) : null}
										</div>
									);
								})}
							</div>
						) : null}

						{agentPlan.status === "planned" && silences.length > 0 ? (
							<Button
								variant="secondary"
								className="mx-1"
								onClick={handleApply}
								disabled={busy || isWorking}
							>
								Apply planned cuts
							</Button>
						) : null}
					</div>
				) : null}
			</div>

			<div className="border-t bg-background/40 p-3">
				<div className="rounded-[20px] border bg-background/70 px-4 py-3 shadow-sm">
				<Textarea
					className="min-h-[74px] resize-none border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:border-0"
					placeholder="Describe what you want to create..."
					value={agentPrompt}
					onChange={(event) => setAgentPrompt(event.target.value)}
					disabled={busy || isWorking}
				/>
				<div className="mt-4 flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<button
							type="button"
							className="text-muted-foreground flex size-8 items-center justify-center rounded-md border bg-transparent text-sm"
							disabled
						>
							+
						</button>
						<button
							type="button"
							className="text-muted-foreground flex size-8 items-center justify-center rounded-md border bg-transparent text-xs"
							disabled
						>
							|||
						</button>
					</div>
					<div className="flex items-center gap-3">
						<div className="text-muted-foreground flex items-center gap-1 text-xs">
							<span>Opus 4.8 High</span>
							<span>v</span>
						</div>
						<Button
							size="sm"
							className="min-w-[72px] rounded-xl px-4"
							onClick={handleRun}
							disabled={busy || isWorking || !agentPrompt.trim() || enabledCount === 0}
						>
							{busy ? "Waiting..." : "Send"}
						</Button>
					</div>
				</div>
				</div>
			</div>
		</div>
	);
}
