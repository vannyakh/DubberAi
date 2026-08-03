"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
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
	BookmarkCheck,
	BookmarkPlus,
	CaptionsOff,
	ChevronLeft,
	FileText,
	Languages,
	Loader2,
	Pause,
	Play,
	Search,
	SlidersHorizontal,
	Sparkles,
	Users,
} from "lucide-react";
import { hasMediaId } from "@/timeline";
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
				"rounded-xl bg-[#26262c] text-[13px] leading-relaxed text-white/90",
				compact ? "px-3.5 py-2.5 text-[12.5px]" : "px-3.5 py-3",
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
	avatarUrl,
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
	avatarUrl?: string | null;
}) {
	const speaker = segment.speaker || `Speaker ${index + 1}`;
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
		<div className="group flex flex-col gap-1.5">
			<div className="flex items-center gap-2.5 px-0.5">
				<Avatar
					className={cn(
						"shrink-0 border border-white/10",
						compact ? "size-7" : "size-8",
					)}
				>
					{avatarUrl ? (
						<AvatarImage
							src={avatarUrl}
							alt={speaker}
							className="object-cover"
						/>
					) : null}
					<AvatarFallback
						className={cn(
							"bg-linear-to-br font-semibold text-white",
							compact ? "text-[10px]" : "text-[11px]",
							speakerColor(speaker),
						)}
					>
						{speakerInitials(speaker)}
					</AvatarFallback>
				</Avatar>
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
				<div className="flex-1" />
				{previewEnabled ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-7 shrink-0 gap-1.5 rounded-lg border-white/8 bg-transparent px-2 text-[11px] text-white/70 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-white/5 data-[playing=true]:opacity-100"
						data-playing={previewState !== "idle"}
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
	avatarUrl,
	hideHeader = false,
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
	avatarUrl?: string | null;
	hideHeader?: boolean;
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
			{!hideHeader ? (
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
			) : null}
			{compact ? (
				<CardContent
					className={cn(
						"flex flex-col gap-3 px-4 pb-0",
						hideHeader && "pt-4",
					)}
				>
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
			<CardContent className="flex flex-col gap-4 px-4 pb-4 pt-1">
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
							avatarUrl={avatarUrl}
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
		sourceLang,
		targetLang,
		detectedLanguage,
		transcriptSegments,
		translationSegments,
		speakerVoices,
		speakerProfiles,
		defaultVoice,
		voicePresets,
		setSourceLang,
		setTargetLang,
		setSpeakerVoice,
		setDefaultVoice,
		saveVoicePreset,
		applyVoicePreset,
		beginJob,
		clearJob,
		reset,
	} = useDubbingStore();

	const [busy, setBusy] = useState(false);
	const [screen, setScreen] = useState<"home" | "transcript">("home");
	const [trackChoice, setTrackChoice] = useState("main");
	const isWorking = busy || isDubbingBusy(status);
	const hasTranscript = transcriptSegments.length > 0;
	const showTranscriptScreen = screen === "transcript" && hasTranscript;
	const canPreviewSegments =
		transcriptSegments.length > 0 && translationSegments.length > 0;

	const selectedAsset = useMemo(
		() => resolveDubSourceAsset({ editor }),
		[editor, sceneTracks],
	);

	const trackOptions = useMemo(() => {
		const options: Array<{ id: string; label: string }> = [];
		if (selectedAsset) {
			options.push({ id: "main", label: "Video track 1" });
		}
		(sceneTracks?.audio ?? []).forEach((track, index) => {
			if (track.elements.length === 0) return;
			options.push({
				id: track.id,
				label: track.name || `Audio track ${index + 1}`,
			});
		});
		return options;
	}, [selectedAsset, sceneTracks]);

	const resolveTranscribeAsset = () => {
		if (trackChoice === "main") return selectedAsset;
		const track = sceneTracks?.audio.find((t) => t.id === trackChoice);
		const assets = editor.media.getAssets();
		for (const element of track?.elements ?? []) {
			if (!hasMediaId(element)) continue;
			const asset = assets.find((a) => a.id === element.mediaId);
			if (asset) return asset;
		}
		return null;
	};

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

	const handleTranscribe = () => {
		const asset = resolveTranscribeAsset();
		if (!asset) {
			toast.error("The selected track has no media to transcribe");
			return;
		}
		void runDubAction(async (signal) => {
			await runTranscription({ asset, signal });
			setScreen("transcript");
		});
	};

	const handleTranscribeAgain = () => {
		stopPreviewsAndJobs();
		reset();
		setScreen("home");
	};

	const effectiveTrackChoice = trackOptions.some(
		(option) => option.id === trackChoice,
	)
		? trackChoice
		: (trackOptions[0]?.id ?? "");

	return (
		<PanelView>
			<ScrollArea className="h-full">
				<div className="flex flex-col gap-4 p-3">
					{showTranscriptScreen ? (
						<>
							<div className="flex items-center gap-2 px-0.5">
								<button
									type="button"
									className="flex size-7 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/5 hover:text-white"
									onClick={() => setScreen("home")}
									aria-label="Back"
								>
									<ChevronLeft className="size-4" />
								</button>
								<h3 className="truncate text-sm font-semibold text-white">
									Transcript-based editing
									{detectedLanguage ? ` (${detectedLanguage})` : ""}
								</h3>
							</div>
							<SegmentList
								segments={transcriptSegments}
								title="Transcript"
								hideHeader
								previewEnabled={canPreviewSegments}
								translationSegments={translationSegments}
								speakerVoices={speakerVoices}
								speakerProfiles={speakerProfiles}
								defaultVoice={defaultVoice}
								isBusyPipeline={isWorking}
								compact
								avatarUrl={selectedAsset?.thumbnailUrl ?? null}
							/>
							{translationSegments.length > 0 ? (
								<SegmentList
									segments={translationSegments}
									title={`Translation-based editing (${targetLang})`}
									description="Review translated segments and preview generated speech."
									icon={<Languages className="size-3.5" />}
									previewEnabled={canPreviewSegments}
									speakerVoices={speakerVoices}
									speakerProfiles={speakerProfiles}
									defaultVoice={defaultVoice}
									isBusyPipeline={isWorking}
									compact
									avatarUrl={selectedAsset?.thumbnailUrl ?? null}
								/>
							) : null}
						</>
					) : (
						<>
					<Card className="border-white/8 bg-[#24252b] shadow-none">
						<CardHeader className="items-center px-5 pb-4 text-center">
							<div className="mb-1 flex size-10 items-center justify-center rounded-full bg-white/5 text-white/80">
								<FileText className="size-4" />
							</div>
							<CardTitle className="text-base text-white">
								Transcript-based editing
							</CardTitle>
							<CardDescription className="max-w-xs text-xs leading-relaxed text-white/60">
								Edit videos quickly by editing their transcripts.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4 px-5 pb-5">
							{!hasTranscript ? (
								<>
									<div className="space-y-2">
										<span className="text-xs font-medium text-white/70">
											Select spoken language
										</span>
										<Select
											value={sourceLang}
											onValueChange={setSourceLang}
										>
											<SelectTrigger className="h-11 w-full rounded-xl border-white/8 bg-white/5 text-sm text-white">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="auto">Auto detect</SelectItem>
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
											Select track to transcribe
										</span>
										<Select
											value={effectiveTrackChoice}
											onValueChange={setTrackChoice}
										>
											<SelectTrigger className="h-11 w-full rounded-xl border-white/8 bg-white/5 text-sm text-white">
												<SelectValue placeholder="No tracks with media" />
											</SelectTrigger>
											<SelectContent>
												{trackOptions.map((option) => (
													<SelectItem key={option.id} value={option.id}>
														{option.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<Button
										className="h-11 w-full rounded-xl bg-cyan-500 text-white hover:bg-cyan-400"
										disabled={isWorking || trackOptions.length === 0}
										onClick={handleTranscribe}
									>
										{isWorking && status === "transcribing"
											? "Transcribing…"
											: "Transcribe"}
									</Button>
								</>
							) : (
								<>
									<Button
										className="h-11 w-full rounded-xl bg-cyan-500 text-white hover:bg-cyan-400"
										onClick={() => setScreen("transcript")}
									>
										Edit transcript
									</Button>
									<Button
										className="h-11 w-full rounded-xl border-0 bg-white/8 text-white hover:bg-white/12"
										disabled={isWorking}
										onClick={handleTranscribeAgain}
									>
										Transcribe again
									</Button>
								</>
							)}
						</CardContent>
					</Card>

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

							<div className="grid grid-cols-2 gap-2">
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
									const currentVoice =
										speakerVoices[speaker] ?? defaultVoice;
									const savedPreset =
										voicePresets[speaker.trim().toLowerCase()];
									const isSaved =
										savedPreset?.voice === currentVoice;
									const presetEntries = Object.values(voicePresets);
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
										<div className="flex shrink-0 items-center gap-1.5">
											<Select
												value={currentVoice}
												onValueChange={(value) => {
													if (value.startsWith("preset:")) {
														applyVoicePreset(
															speaker,
															value.slice("preset:".length),
														);
														return;
													}
													setSpeakerVoice(speaker, value);
												}}
											>
												<SelectTrigger className="h-9 w-40 rounded-lg border-white/8 bg-white/5 text-xs text-white">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{presetEntries.length > 0 ? (
														<SelectGroup>
															<SelectLabel className="text-[11px] text-white/50">
																Saved characters
															</SelectLabel>
															{presetEntries.map((preset) => (
																<SelectItem
																	key={`preset:${preset.name}`}
																	value={`preset:${preset.name}`}
																>
																	{preset.name} · {preset.voice}
																</SelectItem>
															))}
															<SelectSeparator />
														</SelectGroup>
													) : null}
													{VOICES.map(
														(voice: { id: string; label: string }) => (
															<SelectItem key={voice.id} value={voice.id}>
																{voice.label}
															</SelectItem>
														),
													)}
												</SelectContent>
											</Select>
											<Button
												variant="outline"
												size="icon"
												title={
													isSaved
														? `"${speaker}" voice saved`
														: `Save "${speaker}" character voice`
												}
												className="size-9 rounded-lg border-white/8 bg-transparent text-white/70 hover:bg-white/5 hover:text-white"
												onClick={() => {
													saveVoicePreset({
														name: speaker,
														voice: currentVoice,
														profile: profile ?? null,
													});
													toast.success(
														`Saved "${speaker}" character voice`,
													);
												}}
											>
												{isSaved ? (
													<BookmarkCheck className="size-4 text-cyan-400" />
												) : (
													<BookmarkPlus className="size-4" />
												)}
											</Button>
										</div>
									</div>
									);
								})}
							</CardContent>
						</Card>
					) : null}

						</>
					)}
				</div>
			</ScrollArea>
		</PanelView>
	);
}
