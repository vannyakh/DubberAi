"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditor } from "@/editor/use-editor";
import { VOICES, LANGUAGES, tokenizeSegmentText } from "@dubbercut/utils";
import type { Segment } from "@dubbercut/types";
import { toast } from "sonner";
import { cn } from "@/utils/ui";
import { Loader2, Pause, Play } from "lucide-react";
import { useDubbingStore, isDubbingBusy } from "../dubbing-store";
import {
	runFullDub,
	runTranscription,
	runTranslation,
	runSpeechAndApply,
} from "../run-dub";
import { resolveDubSourceAsset } from "../resolve-source";
import {
	clearSegmentPreviewCache,
	previewSegmentSpeech,
	resolvePreviewSegment,
	stopSegmentPreview,
} from "../preview-segment";

const SPEAKER_COLORS = [
	"from-cyan-400/80 to-blue-600/80",
	"from-violet-400/80 to-fuchsia-600/80",
	"from-emerald-400/80 to-teal-600/80",
	"from-amber-400/80 to-orange-600/80",
	"from-rose-400/80 to-pink-600/80",
];

function formatSegmentTime(seconds: number): string {
	const total = Math.max(0, Math.floor(seconds));
	const m = Math.floor(total / 60);
	const s = total % 60;
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTrimWindow(segment: Segment): string | null {
	if (segment.end == null || segment.end <= segment.time) return null;
	const duration = Math.max(0, segment.end - segment.time);
	return `${duration.toFixed(1)}s trim`;
}

function speakerInitials(speaker: string): string {
	const parts = speaker.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "S";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function speakerColor(speaker: string): string {
	let hash = 0;
	for (let i = 0; i < speaker.length; i++) {
		hash = (hash * 31 + speaker.charCodeAt(i)) >>> 0;
	}
	return SPEAKER_COLORS[hash % SPEAKER_COLORS.length];
}

/** Prefer raw body (keeps pause markers); fall back to reconstructed display text. */
function segmentDisplayText(segment: Segment): string {
	const match = segment.raw?.match(/\]\s+[^:]+:\s+(.*)$/);
	const body = match?.[1]?.trim();
	if (body) return body;

	const parts: string[] = [];
	if (segment.pauseBeforeSeconds && segment.pauseBeforeSeconds > 0) {
		parts.push(`(...${segment.pauseBeforeSeconds}s)`);
	}
	if (segment.text) parts.push(segment.text);
	for (const pause of segment.inlinePauses ?? []) {
		parts.push(`(...${pause}s)`);
	}
	if (segment.pauseAfterSeconds && segment.pauseAfterSeconds > 0) {
		parts.push(`(...${segment.pauseAfterSeconds}s)`);
	}
	return parts.join(" ").trim() || segment.text;
}

function SegmentBody({ text }: { text: string }) {
	const tokens = tokenizeSegmentText(text);
	return (
		<p className="rounded-lg bg-[#1c1c22] px-3 py-2.5 text-[13px] leading-relaxed text-white/90">
			{tokens.map((token, index) =>
				token.type === "pause" ? (
					<span
						key={`${token.value}-${index}`}
						className="mx-0.5 italic text-white/40"
					>
						{token.value}
					</span>
				) : (
					<span key={`${token.value}-${index}`}>{token.value}</span>
				),
			)}
		</p>
	);
}

function SegmentCard({
	segment,
	index,
	previewEnabled,
	previewSegment,
	voice,
	isBusyPipeline,
}: {
	segment: Segment;
	index: number;
	previewEnabled: boolean;
	previewSegment: Segment | null;
	voice: string;
	isBusyPipeline: boolean;
}) {
	const speaker = segment.speaker || `Speaker ${index + 1}`;
	const trimLabel = formatTrimWindow(segment);
	const pauseTotal =
		(segment.pauseBeforeSeconds ?? 0) +
		(segment.pauseAfterSeconds ?? 0) +
		(segment.inlinePauses?.reduce((sum, value) => sum + value, 0) ?? 0);
	const [previewState, setPreviewState] = useState<
		"idle" | "loading" | "playing"
	>("idle");
	const requestIdRef = useRef(0);

	useEffect(() => {
		return () => {
			requestIdRef.current += 1;
			stopSegmentPreview();
		};
	}, []);

	const handlePreview = async () => {
		if (!previewEnabled || !previewSegment) {
			toast.error("Translate first to preview dubbed speech");
			return;
		}
		if (previewState === "playing") {
			stopSegmentPreview();
			setPreviewState("idle");
			return;
		}
		if (previewState === "loading" || isBusyPipeline) return;

		const requestId = ++requestIdRef.current;
		setPreviewState("loading");
		try {
			await previewSegmentSpeech({
				segment: previewSegment,
				voice,
				onPlaying: () => {
					if (requestIdRef.current === requestId) {
						setPreviewState("playing");
					}
				},
				onEnded: () => {
					if (requestIdRef.current === requestId) {
						setPreviewState("idle");
					}
				},
			});
		} catch (error) {
			if (requestIdRef.current !== requestId) return;
			setPreviewState("idle");
			toast.error(
				error instanceof Error ? error.message : "Preview failed",
			);
		}
	};

	return (
		<div className="flex flex-col gap-2 rounded-xl border border-white/6 bg-white/[0.02] p-2.5">
			<div className="flex items-center gap-2.5">
				<div
					className={cn(
						"flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-[11px] font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
						speakerColor(speaker),
					)}
					aria-hidden
				>
					{speakerInitials(speaker)}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className="truncate text-sm font-medium text-white">
							{speaker}
						</span>
						<span className="rounded-md bg-teal-500/90 px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-white">
							{formatSegmentTime(segment.time)}
						</span>
						{trimLabel ? (
							<span className="rounded-md bg-white/8 px-1.5 py-0.5 font-mono text-[10px] text-white/55">
								{trimLabel}
							</span>
						) : null}
						{pauseTotal > 0 ? (
							<span className="rounded-md bg-white/8 px-1.5 py-0.5 text-[10px] italic text-white/45">
								pauses {pauseTotal.toFixed(1)}s
							</span>
						) : null}
					</div>
				</div>
				{previewEnabled ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-7 shrink-0 gap-1.5 px-2 text-[11px]"
						disabled={isBusyPipeline && previewState !== "playing"}
						onClick={() => void handlePreview()}
					>
						{previewState === "loading" ? (
							<>
								<Loader2 className="size-3.5 animate-spin" />
								Preview
							</>
						) : previewState === "playing" ? (
							<>
								<Pause className="size-3.5" />
								Stop
							</>
						) : (
							<>
								<Play className="size-3.5" />
								Preview
							</>
						)}
					</Button>
				) : null}
			</div>
			<SegmentBody text={segmentDisplayText(segment)} />
		</div>
	);
}

function SegmentList({
	segments,
	title,
	previewEnabled = false,
	translationSegments = [],
	speakerVoices,
	defaultVoice,
	isBusyPipeline = false,
}: {
	segments: Segment[];
	title: string;
	previewEnabled?: boolean;
	translationSegments?: Segment[];
	speakerVoices?: Record<string, string>;
	defaultVoice?: string;
	isBusyPipeline?: boolean;
}) {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-medium text-muted-foreground">
					{title}
				</span>
				<span className="text-[10px] text-muted-foreground/80">
					{previewEnabled
						? "Preview clipped TTS before apply"
						: "Parallel TTS · aligned trim"}
				</span>
			</div>
			<div className="flex flex-col gap-2">
				{segments.map((segment, index) => {
					const previewTarget = previewEnabled
						? resolvePreviewSegment({
								transcriptSegment: segment,
								transcriptIndex: index,
								translationSegments,
							})
						: null;
					const voice =
						(previewTarget &&
							speakerVoices?.[previewTarget.speaker]) ||
						speakerVoices?.[segment.speaker] ||
						defaultVoice ||
						"Kore";
					return (
						<SegmentCard
							key={`${segment.time}-${segment.speaker}-${index}`}
							segment={segment}
							index={index}
							previewEnabled={previewEnabled}
							previewSegment={previewTarget}
							voice={voice}
							isBusyPipeline={isBusyPipeline}
						/>
					);
				})}
			</div>
		</div>
	);
}

export function DubbingView() {
	const editor = useEditor();
	const sceneTracks = useEditor(
		(e) => e.scenes.getActiveSceneOrNull()?.tracks ?? null,
	);

	const {
		status,
		error,
		targetLang,
		detectedLanguage,
		transcriptSegments,
		translationSegments,
		speakerVoices,
		defaultVoice,
		setTargetLang,
		setSpeakerVoice,
		setDefaultVoice,
		beginJob,
		clearJob,
		reset,
	} = useDubbingStore();

	const [busy, setBusy] = useState(false);
	const isWorking = busy || isDubbingBusy(status);
	const canPreviewSegments =
		transcriptSegments.length > 0 && translationSegments.length > 0;

	const selectedAsset = useMemo(
		() => resolveDubSourceAsset({ editor }),
		[editor, sceneTracks],
	);

	const speakers = useMemo(() => {
		const names = new Set<string>();
		for (const segment of transcriptSegments) names.add(segment.speaker);
		for (const segment of translationSegments) names.add(segment.speaker);
		return [...names].filter(Boolean);
	}, [transcriptSegments, translationSegments]);

	useEffect(() => {
		return () => {
			stopSegmentPreview();
		};
	}, []);

	const guard = async (
		fn: (signal: AbortSignal) => Promise<void>,
		doneMessage?: string,
	) => {
		if (!selectedAsset) {
			toast.error("Add a video to the main scene track first");
			return;
		}
		stopSegmentPreview();
		setBusy(true);
		const signal = beginJob();
		try {
			await fn(signal);
			if (!signal.aborted && doneMessage) toast.success(doneMessage);
		} catch (err) {
			if (
				signal.aborted ||
				(err instanceof Error && err.name === "DubCancelledError")
			) {
				useDubbingStore.getState().cancelJob();
				return;
			}
			toast.error(
				err instanceof Error ? err.message : "Dubbing step failed",
			);
		} finally {
			clearJob();
			setBusy(false);
		}
	};

	const handleReset = () => {
		stopSegmentPreview();
		clearSegmentPreviewCache();
		reset();
	};

	return (
		<PanelView>
			<ScrollArea className="h-full">
				<div className="flex flex-col gap-4 p-3">
					<div className="flex flex-col gap-2">
						<span className="text-xs font-medium text-muted-foreground">
							Translate to
						</span>
						<Select value={targetLang} onValueChange={setTargetLang}>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{LANGUAGES.map((lang) => (
									<SelectItem key={lang.code} value={lang.code}>
										{lang.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-2">
						<span className="text-xs font-medium text-muted-foreground">
							Default voice
						</span>
						<Select value={defaultVoice} onValueChange={setDefaultVoice}>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{VOICES.map((voice: { id: string; label: string }) => (
									<SelectItem key={voice.id} value={voice.id}>
										{voice.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<Button
						className="w-full"
						disabled={isWorking || !selectedAsset}
						onClick={() =>
							guard(
								(signal) =>
									runFullDub({
										editor,
										asset: selectedAsset!,
										signal,
									}),
								"Speaker vocals added to timeline",
							)
						}
					>
						{isWorking
							? "Working…"
							: "Auto dub (transcribe → translate → TTS)"}
					</Button>

					<div className="grid grid-cols-3 gap-1.5">
						<Button
							variant="outline"
							size="sm"
							disabled={isWorking || !selectedAsset}
							onClick={() =>
								guard((signal) =>
									runTranscription({
										asset: selectedAsset!,
										signal,
									}),
								)
							}
						>
							Transcribe
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={isWorking || transcriptSegments.length === 0}
							onClick={() =>
								guard((signal) => runTranslation({ signal }))
							}
						>
							Translate
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={isWorking || translationSegments.length === 0}
							onClick={() =>
								guard(
									(signal) =>
										runSpeechAndApply({ editor, signal }),
									"Speaker vocals added to timeline",
								)
							}
						>
							Voice + apply
						</Button>
					</div>

					{error && status === "error" ? (
						<p className="rounded-md bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
							{error}
						</p>
					) : null}

					{speakers.length > 0 ? (
						<div className="flex flex-col gap-2">
							<span className="text-xs font-medium text-muted-foreground">
								Speaker voices → timeline tracks
							</span>
							{speakers.map((speaker) => (
								<div
									key={speaker}
									className="flex items-center justify-between gap-2"
								>
									<div className="flex min-w-0 items-center gap-2">
										<div
											className={cn(
												"flex size-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-[9px] font-semibold text-white",
												speakerColor(speaker),
											)}
										>
											{speakerInitials(speaker)}
										</div>
										<span className="truncate text-xs">
											{speaker}
											<span className="text-muted-foreground">
												{" "}
												· Dub track
											</span>
										</span>
									</div>
									<Select
										value={speakerVoices[speaker] ?? defaultVoice}
										onValueChange={(voice) =>
											setSpeakerVoice(speaker, voice)
										}
									>
										<SelectTrigger className="h-7 w-36 text-xs">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{VOICES.map(
												(voice: { id: string; label: string }) => (
													<SelectItem
														key={voice.id}
														value={voice.id}
													>
														{voice.label}
													</SelectItem>
												),
											)}
										</SelectContent>
									</Select>
								</div>
							))}
						</div>
					) : null}

					{transcriptSegments.length > 0 ? (
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-end">
								<button
									type="button"
									className={cn(
										"text-xs text-muted-foreground underline-offset-2 hover:underline",
										isWorking && "pointer-events-none opacity-50",
									)}
									onClick={handleReset}
								>
									Clear
								</button>
							</div>
							<SegmentList
								segments={transcriptSegments}
								title={`Transcript${detectedLanguage ? ` (${detectedLanguage})` : ""}`}
								previewEnabled={canPreviewSegments}
								translationSegments={translationSegments}
								speakerVoices={speakerVoices}
								defaultVoice={defaultVoice}
								isBusyPipeline={isWorking}
							/>
						</div>
					) : null}

					{translationSegments.length > 0 ? (
						<SegmentList
							segments={translationSegments}
							title={`Translation (${targetLang})`}
						/>
					) : null}
				</div>
			</ScrollArea>
		</PanelView>
	);
}
