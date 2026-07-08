"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useEditor } from "@/editor/use-editor";
import { VOICES, LANGUAGES, tokenizeSegmentText } from "@dubbercut/utils";
import type { Segment, SpeakerVocalProfile } from "@dubbercut/types";
import { toast } from "sonner";
import { cn } from "@/utils/ui";
import {
	CaptionsOff,
	FileText,
	Languages,
	Loader2,
	Pause,
	Play,
	RotateCcw,
	Search,
	SlidersHorizontal,
	Sparkles,
	Users,
} from "lucide-react";
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
	resolvePreviewStyle,
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

function SegmentBody({ text, compact = false }: { text: string; compact?: boolean }) {
	const tokens = tokenizeSegmentText(text);
	return (
		<p
			className={cn(
				"rounded-lg bg-[#1c1c22] text-[13px] leading-relaxed text-white/90",
				compact ? "px-3 py-2 text-[12.5px]" : "px-3 py-2.5",
			)}
		>
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

function formatFeelingLabel(value?: string): string | null {
	if (!value || value === "neutral") return null;
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function SegmentCard({
	segment,
	index,
	previewEnabled,
	previewSegment,
	voice,
	isBusyPipeline,
	compact = false,
	style,
}: {
	segment: Segment;
	index: number;
	previewEnabled: boolean;
	previewSegment: Segment | null;
	voice: string;
	isBusyPipeline: boolean;
	compact?: boolean;
	style?: {
		feeling?: string;
		intensity?: string;
		delivery?: string;
		persona?: string;
	};
}) {
	const speaker = segment.speaker || `Speaker ${index + 1}`;
	const trimLabel = formatTrimWindow(segment);
	const feelingLabel = formatFeelingLabel(
		style?.feeling ?? segment.feeling,
	);
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
				style,
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
		<div
			className={cn(
				"flex flex-col gap-2 rounded-xl border border-white/6 bg-white/[0.02]",
				compact ? "p-2" : "p-2.5",
			)}
		>
			<div className={cn("flex items-center gap-2.5", compact && "gap-2")}>
				{compact ? (
					<Avatar className="size-7 border border-white/8">
						<AvatarFallback
							className={cn(
								"bg-linear-to-br text-[10px] font-semibold text-white",
								speakerColor(speaker),
							)}
						>
							{speakerInitials(speaker)}
						</AvatarFallback>
					</Avatar>
				) : (
					<div
						className={cn(
							"flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-[11px] font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
							speakerColor(speaker),
						)}
						aria-hidden
					>
						{speakerInitials(speaker)}
					</div>
				)}
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<span
							className={cn(
								"truncate font-medium text-white",
								compact ? "text-[13px]" : "text-sm",
							)}
						>
							{speaker}
						</span>
						<Badge className="rounded-md border-0 bg-cyan-500/90 px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-white hover:bg-cyan-500/90">
							{formatSegmentTime(segment.time)}
						</Badge>
						{trimLabel ? (
							<span className="rounded-md bg-white/8 px-1.5 py-0.5 font-mono text-[10px] text-white/55">
								{trimLabel}
							</span>
						) : null}
						{feelingLabel ? (
							<span className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-200">
								{feelingLabel}
								{style?.intensity && style.intensity !== "medium"
									? ` · ${style.intensity}`
									: ""}
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
						className={cn(
							"h-7 shrink-0 gap-1.5 border-white/8 bg-transparent px-2 text-[11px] text-white/80 hover:bg-white/5",
							compact && "rounded-lg",
						)}
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
			<SegmentBody text={segmentDisplayText(segment)} compact={compact} />
		</div>
	);
}

function SegmentList({
	segments,
	title,
	description,
	icon,
	previewEnabled = false,
	translationSegments = [],
	speakerVoices,
	speakerProfiles,
	defaultVoice,
	isBusyPipeline = false,
	compact = false,
}: {
	segments: Segment[];
	title: string;
	description?: string;
	icon?: React.ReactNode;
	previewEnabled?: boolean;
	translationSegments?: Segment[];
	speakerVoices?: Record<string, string>;
	speakerProfiles?: Record<string, SpeakerVocalProfile>;
	defaultVoice?: string;
	isBusyPipeline?: boolean;
	compact?: boolean;
}) {
	const [query, setQuery] = useState("");
	const visibleSegments = compact
		? segments.filter((segment) => {
				const haystack = `${segment.speaker} ${segmentDisplayText(segment)}`.toLowerCase();
				return haystack.includes(query.trim().toLowerCase());
			})
		: segments;

	return (
		<Card className="border-white/8 bg-[#24252b] shadow-none">
			<CardHeader className="flex-row items-start justify-between gap-3 space-y-0 px-4 pb-3">
				<div className="min-w-0 space-y-1">
					<div className="flex items-center gap-2 text-white">
						{icon ? (
							<span className="flex size-7 items-center justify-center rounded-lg bg-white/5 text-white/75">
								{icon}
							</span>
						) : null}
						<CardTitle className="text-sm">{title}</CardTitle>
					</div>
					<CardDescription className="text-xs text-white/55">
						{description ??
							(previewEnabled
								? "Preview clipped TTS before applying to timeline."
								: "Parallel TTS with aligned trim windows.")}
					</CardDescription>
				</div>
				<span className="shrink-0 rounded-md bg-white/5 px-2 py-1 text-[10px] text-white/55">
					{segments.length} segments
				</span>
			</CardHeader>
			{compact ? (
				<CardContent className="flex flex-col gap-3 px-4 pb-0">
					<div className="flex items-center gap-2">
						<div className="relative min-w-0 flex-1">
							<Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-white/35" />
							<Input
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Find"
								className="h-9 rounded-xl border-white/8 bg-white/5 pl-9 text-sm text-white placeholder:text-white/35"
							/>
						</div>
						<Button
							type="button"
							variant="outline"
							size="icon"
							className="size-9 shrink-0 rounded-xl border-white/8 bg-white/5 text-white/70 hover:bg-white/8"
							disabled
						>
							<SlidersHorizontal className="size-4" />
						</Button>
					</div>
				</CardContent>
			) : null}
			<CardContent className="flex flex-col gap-2 px-4 pb-4">
				{visibleSegments.map((segment, index) => {
					const previewTarget = !previewEnabled
						? null
						: translationSegments.length > 0
							? resolvePreviewSegment({
									transcriptSegment: segment,
									transcriptIndex: index,
									translationSegments,
								})
							: segment;
					const voice =
						(previewTarget &&
							speakerVoices?.[previewTarget.speaker]) ||
						speakerVoices?.[segment.speaker] ||
						defaultVoice ||
						"Kore";
					const style = resolvePreviewStyle({
						segment: previewTarget ?? segment,
						speakerProfiles,
					});
					return (
						<SegmentCard
							key={`${segment.time}-${segment.speaker}-${index}`}
							segment={segment}
							index={index}
							previewEnabled={previewEnabled}
							previewSegment={previewTarget}
							voice={voice}
							isBusyPipeline={isBusyPipeline}
							compact={compact}
							style={style}
						/>
					);
				})}
				{visibleSegments.length === 0 ? (
					<div className="rounded-xl border border-dashed border-white/8 bg-black/10 px-3 py-6 text-center text-xs text-white/45">
						No segments match your search.
					</div>
				) : null}
			</CardContent>
		</Card>
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
		speakerProfiles,
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

	const stopPreviewsAndJobs = () => {
		stopSegmentPreview();
		clearSegmentPreviewCache();
	};

	const runDubAction = async (
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
		stopPreviewsAndJobs();
		reset();
	};

	return (
		<PanelView>
			<ScrollArea className="h-full">
				<div className="flex flex-col gap-4 p-3">
					<Card className="border-white/8 bg-[#24252b] shadow-none">
						<CardHeader className="items-center px-5 pb-4 text-center">
							<div className="mb-1 flex size-10 items-center justify-center rounded-full bg-white/5 text-white/80">
								<Sparkles className="size-4" />
							</div>
							<CardTitle className="text-base text-white">
								Dub with AI voices
							</CardTitle>
							<CardDescription className="max-w-xs text-xs leading-relaxed text-white/60">
								Transcribe the main scene track, translate the dialogue, then
								generate speaker-based voice clips aligned to the timeline.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4 px-5 pb-5">
							<div className="space-y-2">
								<span className="text-xs font-medium text-white/70">
									Select output language
								</span>
								<Select value={targetLang} onValueChange={setTargetLang}>
									<SelectTrigger className="h-11 w-full rounded-xl border-white/8 bg-white/5 text-sm text-white">
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

							<div className="space-y-2">
								<span className="text-xs font-medium text-white/70">
									Default speaker voice
								</span>
								<Select value={defaultVoice} onValueChange={setDefaultVoice}>
									<SelectTrigger className="h-11 w-full rounded-xl border-white/8 bg-white/5 text-sm text-white">
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
								className="h-11 w-full rounded-xl bg-cyan-500 text-white hover:bg-cyan-400"
								disabled={isWorking || !selectedAsset}
								onClick={() =>
									runDubAction(
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
								{isWorking ? "Working…" : "Start dubbing"}
							</Button>

							<div className="grid grid-cols-3 gap-2">
								<Button
									variant="outline"
									size="sm"
									className="h-9 rounded-lg border-white/8 bg-transparent text-white/85 hover:bg-white/5"
									disabled={isWorking || !selectedAsset}
									onClick={() =>
										runDubAction((signal) =>
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
									className="h-9 rounded-lg border-white/8 bg-transparent text-white/85 hover:bg-white/5"
									disabled={isWorking || transcriptSegments.length === 0}
									onClick={() =>
										runDubAction((signal) => runTranslation({ signal }))
									}
								>
									Translate
								</Button>
								<Button
									variant="outline"
									size="sm"
									className="h-9 rounded-lg border-white/8 bg-transparent text-white/85 hover:bg-white/5"
									disabled={isWorking || translationSegments.length === 0}
									onClick={() =>
										runDubAction(
											(signal) =>
												runSpeechAndApply({ editor, signal }),
											"Speaker vocals added to timeline",
										)
									}
								>
									Apply
								</Button>
							</div>

							{!selectedAsset ? (
								<div className="flex items-start gap-2 rounded-xl border border-dashed border-white/8 bg-black/10 px-3 py-2.5 text-xs text-white/55">
									<CaptionsOff className="mt-0.5 size-3.5 shrink-0" />
									<span>Add a video clip to the main scene track to begin.</span>
								</div>
							) : null}
						</CardContent>
					</Card>

					{error && status === "error" ? (
						<p className="rounded-md bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
							{error}
						</p>
					) : null}

					{(speakers.length > 0 ||
						transcriptSegments.length > 0 ||
						translationSegments.length > 0) && (
						<Separator className="bg-white/6" />
					)}

					{speakers.length > 0 ? (
						<Card className="border-white/8 bg-[#24252b] shadow-none">
							<CardHeader className="px-4 pb-3">
								<div className="flex items-center gap-2 text-white">
									<span className="flex size-7 items-center justify-center rounded-lg bg-white/5 text-white/75">
										<Users className="size-3.5" />
									</span>
									<CardTitle className="text-sm">
										Speaker voices
									</CardTitle>
								</div>
								<CardDescription className="text-xs text-white/55">
									Auto-detects gender and feeling style, then maps each
									speaker to a matching dub voice.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-2 px-4 pb-4">
								{speakers.map((speaker) => {
									const profile = speakerProfiles[speaker];
									const feeling =
										formatFeelingLabel(profile?.defaultFeeling) ??
										"Natural";
									return (
									<div
										key={speaker}
										className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/[0.02] p-2.5"
									>
										<div className="flex min-w-0 items-center gap-2">
											<div
												className={cn(
													"flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-[10px] font-semibold text-white",
													speakerColor(speaker),
												)}
											>
												{speakerInitials(speaker)}
											</div>
											<div className="min-w-0">
												<div className="truncate text-sm text-white">
													{speaker}
												</div>
												<div className="truncate text-[11px] text-white/45">
													{profile?.gender
														? `${profile.gender} · ${feeling}`
														: "Dub track output"}
													{profile?.persona
														? ` · ${profile.persona}`
														: ""}
												</div>
											</div>
										</div>
										<Select
											value={speakerVoices[speaker] ?? defaultVoice}
											onValueChange={(voice) =>
												setSpeakerVoice(speaker, voice)
											}
										>
											<SelectTrigger className="h-9 w-40 rounded-lg border-white/8 bg-white/5 text-xs text-white">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{VOICES.map(
													(voice: { id: string; label: string }) => (
														<SelectItem key={voice.id} value={voice.id}>
															{voice.label}
														</SelectItem>
													),
												)}
											</SelectContent>
										</Select>
									</div>
									);
								})}
							</CardContent>
						</Card>
					) : null}

					{transcriptSegments.length > 0 ? (
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-end">
								<button
									type="button"
									className={cn(
										"inline-flex items-center gap-1 text-xs text-white/55 underline-offset-2 hover:text-white/75 hover:underline",
										isWorking && "pointer-events-none opacity-50",
									)}
									onClick={handleReset}
								>
									<RotateCcw className="size-3" />
									Clear
								</button>
							</div>
							<SegmentList
								segments={transcriptSegments}
								title={`Transcript-based editing${detectedLanguage ? ` (${detectedLanguage})` : ""}`}
								description="Review transcript segments, search dialogue, preview generated speech, and refine before applying voices."
								icon={<FileText className="size-3.5" />}
								previewEnabled={canPreviewSegments}
								translationSegments={translationSegments}
								speakerVoices={speakerVoices}
								speakerProfiles={speakerProfiles}
								defaultVoice={defaultVoice}
								isBusyPipeline={isWorking}
								compact
							/>
						</div>
					) : null}

					{translationSegments.length > 0 ? (
						<SegmentList
							segments={translationSegments}
							title={`Translation-based editing (${targetLang})`}
							description="Review translated segments, search dialogue, preview generated speech, and refine before applying voices."
							icon={<Languages className="size-3.5" />}
							previewEnabled={canPreviewSegments}
							speakerVoices={speakerVoices}
							speakerProfiles={speakerProfiles}
							defaultVoice={defaultVoice}
							isBusyPipeline={isWorking}
							compact
						/>
					) : null}
				</div>
			</ScrollArea>
		</PanelView>
	);
}
