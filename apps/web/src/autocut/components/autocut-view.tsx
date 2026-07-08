import { useEffect, useMemo, useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEditor } from "@/editor/use-editor";
import { toast } from "sonner";
import { cn } from "@/utils/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	PlayIcon,
} from "@hugeicons/core-free-icons";
import { effectsRegistry, registerDefaultEffects } from "@/effects";
import { AgentCutPane } from "./agent-cut-pane";
import {
	isAutoCutBusy,
	useAutoCutStore,
	type AutoCutViewMode,
} from "../autocut-store";
import { runApplyCuts, runCutDetection } from "../run-autocut";
import { totalSilenceSeconds } from "../silence";
import type { AutoCutDetectionMode, AutoCutTrackCategory } from "../config";
import { DEFAULT_AUTOCUT_PIPELINE } from "../config";
import {
	categoryLabel,
	groupClipsByCategory,
	listCuttableClips,
} from "../track-list";

registerDefaultEffects();

function formatSeconds(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return m > 0 ? `${m}m ${s.toFixed(1)}s` : `${s.toFixed(1)}s`;
}

function SectionCard({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-lg border bg-foreground/[0.02] p-3">
			<div className="mb-2">
				<p className="text-sm font-medium">{title}</p>
				{description ? (
					<p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
						{description}
					</p>
				) : null}
			</div>
			<div className="flex flex-col gap-2">{children}</div>
		</div>
	);
}

function OptionRow({
	label,
	valueLabel,
	children,
}: {
	label: string;
	valueLabel: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between">
				<span className="text-xs font-medium text-muted-foreground">
					{label}
				</span>
				<span className="text-xs font-mono tabular-nums">{valueLabel}</span>
			</div>
			{children}
		</div>
	);
}

function ConfigCheckbox({
	id,
	label,
	description,
	checked,
	onCheckedChange,
	disabled,
}: {
	id: string;
	label: string;
	description?: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	disabled?: boolean;
}) {
	return (
		<label
			htmlFor={id}
			className={cn(
				"flex cursor-pointer items-start gap-2.5 rounded-md border border-transparent px-2 py-1.5 hover:bg-foreground/5",
				disabled && "pointer-events-none opacity-50",
			)}
		>
			<Checkbox
				id={id}
				checked={checked}
				onCheckedChange={(value) => onCheckedChange(value === true)}
				className="mt-0.5"
			/>
			<span className="min-w-0 flex-1">
				<span className="block text-xs font-medium leading-snug">{label}</span>
				{description ? (
					<span className="text-muted-foreground mt-0.5 block text-[11px] leading-snug">
						{description}
					</span>
				) : null}
			</span>
		</label>
	);
}

function TrackCategorySection({
	category,
	clips,
	categoryEnabled,
	onCategoryToggle,
	enabledClips,
	onClipToggle,
	analysisSourceKey,
	onSetAnalysisSource,
}: {
	category: AutoCutTrackCategory;
	clips: ReturnType<typeof listCuttableClips>;
	categoryEnabled: boolean;
	onCategoryToggle: (enabled: boolean) => void;
	enabledClips: Record<string, boolean>;
	onClipToggle: (key: string, enabled: boolean) => void;
	analysisSourceKey: string | null;
	onSetAnalysisSource: (key: string) => void;
}) {
	if (clips.length === 0) return null;

	const allChecked = clips.every((clip) => enabledClips[clip.key]);
	const someChecked = clips.some((clip) => enabledClips[clip.key]);

	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center gap-2 px-1">
				<Checkbox
					checked={allChecked ? true : someChecked ? "indeterminate" : false}
					onCheckedChange={(value) => onCategoryToggle(value === true)}
				/>
				<span className="text-xs font-semibold">{categoryLabel(category)}</span>
				<span className="text-muted-foreground text-[11px]">
					({clips.length})
				</span>
			</div>
			{categoryEnabled && (
				<div className="ml-1 flex flex-col gap-0.5 border-l pl-2">
					{clips.map((clip) => (
						<div
							key={clip.key}
							className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-foreground/5"
						>
							<Checkbox
								checked={enabledClips[clip.key] ?? false}
								onCheckedChange={(value) =>
									onClipToggle(clip.key, value === true)
								}
							/>
							<button
								type="button"
								className="min-w-0 flex-1 text-left"
								onClick={() => onClipToggle(clip.key, !enabledClips[clip.key])}
							>
								<span className="block truncate text-xs">{clip.element.name}</span>
								<span className="text-muted-foreground block truncate text-[10px]">
									{clip.trackLabel}
								</span>
							</button>
							{(enabledClips[clip.key] ?? false) && (
								<Button
									variant={analysisSourceKey === clip.key ? "secondary" : "ghost"}
									size="sm"
									className="h-6 px-2 text-[10px]"
									onClick={() => onSetAnalysisSource(clip.key)}
								>
									Analyze
								</Button>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export function AutoCutView() {
	const editor = useEditor();
	useEditor((e) =>
		listCuttableClips({ editor: e }).map((clip) => clip.key).join("|"),
	);

	const {
		activeMode,
		status,
		error,
		pipeline,
		enabledClips,
		analysisSourceKey,
		silences,
		analyzedDurationSeconds,
		setActiveMode,
		setPipeline,
		toggleClip,
		setCategoryClips,
		setAnalysisSourceKey,
	} = useAutoCutStore();

	const [busy, setBusy] = useState(false);
	const clips = listCuttableClips({ editor });
	const grouped = useMemo(() => groupClipsByCategory(clips), [clips]);

	const availableEffects = useMemo(
		() => effectsRegistry.getAll().map((def) => ({ type: def.type, name: def.name })),
		[],
	);

	useEffect(() => {
		if (clips.length === 0) return;
		const store = useAutoCutStore.getState();
		const next = { ...store.enabledClips };
		let changed = false;
		for (const clip of clips) {
			if (next[clip.key] === undefined) {
				next[clip.key] =
					clip.category === "main" ||
					(clip.category === "audio" && pipeline.cutAudioTracks);
				changed = true;
			}
		}
		if (changed) {
			for (const [key, enabled] of Object.entries(next)) {
				if (store.enabledClips[key] === undefined) {
					toggleClip(key, enabled);
				}
			}
		}
		if (!analysisSourceKey) {
			const main = clips.find((clip) => clip.category === "main");
			setAnalysisSourceKey(main?.key ?? clips[0]?.key ?? null);
		}
	}, [clips, analysisSourceKey, pipeline.cutAudioTracks, setAnalysisSourceKey, toggleClip]);

	const isWorking = busy || isAutoCutBusy(status);
	const removableSeconds = totalSilenceSeconds({ silences });
	const enabledCount = clips.filter((clip) => enabledClips[clip.key]).length;
	const selectedTrackCount = [
		pipeline.cutMainTrack ? grouped.main.length : 0,
		pipeline.cutAudioTracks ? grouped.audio.length : 0,
		pipeline.cutOverlayTracks ? grouped.overlay.length : 0,
	].filter((count) => count > 0).length;
	const detectionMode: AutoCutDetectionMode =
		pipeline.detectionMode ?? DEFAULT_AUTOCUT_PIPELINE.detectionMode;
	const isLlmMode = detectionMode === "llm";
	const primaryActionLabel =
		status === "analyzing"
			? isLlmMode
				? "Transcribing & planning cuts..."
				: "Analyzing audio..."
			: isLlmMode
				? "Start Smart Cut"
				: "Start Silence Cut";

	const handleCategoryToggle = (
		category: AutoCutTrackCategory,
		enabled: boolean,
	) => {
		const keys = grouped[category].map((clip) => clip.key);
		setCategoryClips(keys, enabled);
		if (category === "main") setPipeline({ cutMainTrack: enabled });
		if (category === "audio") setPipeline({ cutAudioTracks: enabled });
		if (category === "overlay") setPipeline({ cutOverlayTracks: enabled });
	};

	const handleDetect = async () => {
		if (enabledCount === 0) {
			toast.error("Select at least one clip on the timeline");
			return;
		}
		setBusy(true);
		try {
			await runCutDetection({ editor });
			const found = useAutoCutStore.getState().silences.length;
			if (found === 0) {
				toast.info("No cut ranges found with the current settings");
			}
		} catch {
			toast.error(useAutoCutStore.getState().error ?? "Analysis failed");
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
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Auto-cut failed");
		} finally {
			setBusy(false);
		}
	};

	const toggleEffect = (effectType: string, enabled: boolean) => {
		const current = new Set(pipeline.selectedEffectTypes);
		if (enabled) current.add(effectType);
		else current.delete(effectType);
		setPipeline({ selectedEffectTypes: [...current] });
	};

	return (
		<PanelView
			className={cn(isWorking && "pointer-events-none opacity-60")}
			title={activeMode === "agentcut" ? "Agent Cut" : "Auto Cut"}
			actions={
				<div className="flex w-full max-w-[360px] gap-1">
					<ModeButton
						label="Auto Cut"
						active={activeMode === "autocut"}
						onClick={() => setActiveMode("autocut")}
					/>
					<ModeButton
						label="Agent Cut"
						active={activeMode === "agentcut"}
						onClick={() => setActiveMode("agentcut")}
					/>
				</div>
			}
			contentClassName={cn("pb-3", activeMode === "agentcut" ? "h-full px-0" : "px-3")}
			scrollClassName="pt-3"
		>
			<div className={cn("flex flex-col gap-4", activeMode === "agentcut" && "h-full")}>
				{activeMode === "autocut" ? (
					<div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
						<span className="rounded-md bg-foreground/5 px-2 py-1">
							{enabledCount} clips
						</span>
						<span className="rounded-md bg-foreground/5 px-2 py-1">
							{selectedTrackCount} track groups
						</span>
						<span className="rounded-md border px-2 py-1">
							{isLlmMode ? "Smart mode" : "Silence mode"}
						</span>
						{silences.length > 0 ? (
							<span className="rounded-md bg-primary/10 px-2 py-1 text-primary">
								{silences.length} cut ranges ready
							</span>
						) : null}
					</div>
				) : null}
				{activeMode === "autocut" ? (
					<div className="flex gap-2">
						<Button
							className="flex-1"
							disabled={isWorking || enabledCount === 0}
							onClick={handleDetect}
						>
							<HugeiconsIcon icon={PlayIcon} className="size-4" />
							{primaryActionLabel}
						</Button>
						{silences.length > 0 ? (
							<Button
								variant="secondary"
								className="flex-1"
								disabled={isWorking}
								onClick={handleApply}
							>
								Apply Cuts
							</Button>
						) : null}
					</div>
				) : null}
				{activeMode === "autocut" ? (
					<StandardAutoCutPane
						clips={clips}
						grouped={grouped}
						pipeline={pipeline}
						enabledClips={enabledClips}
						analysisSourceKey={analysisSourceKey}
						error={error}
						silences={silences}
						analyzedDurationSeconds={analyzedDurationSeconds}
						isWorking={isWorking}
						isLlmMode={isLlmMode}
						removableSeconds={removableSeconds}
						availableEffects={availableEffects}
						handleCategoryToggle={handleCategoryToggle}
						toggleClip={toggleClip}
						setAnalysisSourceKey={setAnalysisSourceKey}
						setPipeline={setPipeline}
						toggleEffect={toggleEffect}
						handleApply={handleApply}
					/>
				) : (
					<AgentCutPane editor={editor} isWorking={false} />
				)}
			</div>
		</PanelView>
	);
}

function ModeButton({
	label,
	active,
	onClick,
}: {
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<Button
			variant={active ? "secondary" : "ghost"}
			className={cn("h-8 flex-1", active && "border border-secondary-border")}
			onClick={onClick}
		>
			{label}
		</Button>
	);
}

function StandardAutoCutPane({
	clips,
	grouped,
	pipeline,
	enabledClips,
	analysisSourceKey,
	error,
	silences,
	analyzedDurationSeconds,
	isWorking,
	isLlmMode,
	removableSeconds,
	availableEffects,
	handleCategoryToggle,
	toggleClip,
	setAnalysisSourceKey,
	setPipeline,
	toggleEffect,
	handleApply,
}: {
	clips: ReturnType<typeof listCuttableClips>;
	grouped: ReturnType<typeof groupClipsByCategory>;
	pipeline: typeof DEFAULT_AUTOCUT_PIPELINE;
	enabledClips: Record<string, boolean>;
	analysisSourceKey: string | null;
	error: string | null;
	silences: Array<{ startSeconds: number; endSeconds: number }>;
	analyzedDurationSeconds: number;
	isWorking: boolean;
	isLlmMode: boolean;
	removableSeconds: number;
	availableEffects: Array<{ type: string; name: string }>;
	handleCategoryToggle: (category: AutoCutTrackCategory, enabled: boolean) => void;
	toggleClip: (key: string, enabled: boolean) => void;
	setAnalysisSourceKey: (key: string | null) => void;
	setPipeline: (partial: Partial<typeof DEFAULT_AUTOCUT_PIPELINE>) => void;
	toggleEffect: (effectType: string, enabled: boolean) => void;
	handleApply: () => Promise<void>;
}) {
	const enabledCount = clips.filter((clip) => enabledClips[clip.key]).length;

	return (
		<>
			<SectionCard
				title="Tracks to cut"
				description="Choose which tracks participate in cutting, then mark one clip as the analysis source."
			>
				{clips.length === 0 ? (
					<p className="text-muted-foreground text-xs">
						Add video or audio clips to the timeline first.
					</p>
				) : (
					<div className="flex flex-col gap-2">
						<TrackCategorySection
							category="main"
							clips={grouped.main}
							categoryEnabled={pipeline.cutMainTrack}
							onCategoryToggle={(enabled) =>
								handleCategoryToggle("main", enabled)
							}
							enabledClips={enabledClips}
							onClipToggle={toggleClip}
							analysisSourceKey={analysisSourceKey}
							onSetAnalysisSource={(key) => setAnalysisSourceKey(key)}
						/>
						<TrackCategorySection
							category="audio"
							clips={grouped.audio}
							categoryEnabled={pipeline.cutAudioTracks}
							onCategoryToggle={(enabled) =>
								handleCategoryToggle("audio", enabled)
							}
							enabledClips={enabledClips}
							onClipToggle={toggleClip}
							analysisSourceKey={analysisSourceKey}
							onSetAnalysisSource={(key) => setAnalysisSourceKey(key)}
						/>
						<TrackCategorySection
							category="overlay"
							clips={grouped.overlay}
							categoryEnabled={pipeline.cutOverlayTracks}
							onCategoryToggle={(enabled) =>
								handleCategoryToggle("overlay", enabled)
							}
							enabledClips={enabledClips}
							onClipToggle={toggleClip}
							analysisSourceKey={analysisSourceKey}
							onSetAnalysisSource={(key) => setAnalysisSourceKey(key)}
						/>
					</div>
				)}
			</SectionCard>

			<SectionCard
				title="Detection mode"
				description="Pick AI-assisted cutting or local silence detection."
			>
				<RadioGroup
					value={pipeline.detectionMode}
					onValueChange={(value) =>
						setPipeline({ detectionMode: value as AutoCutDetectionMode })
					}
					className="flex flex-col gap-1.5"
				>
					<label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-transparent px-2 py-1.5 hover:bg-foreground/5">
						<RadioGroupItem value="llm" className="mt-0.5" />
						<span className="min-w-0 flex-1">
							<span className="block text-xs font-medium">Smart cut</span>
							<span className="text-muted-foreground mt-0.5 block text-[11px] leading-snug">
								Analyze speech and suggest cleaner cuts like pauses, fillers,
								and retakes.
							</span>
						</span>
					</label>
					<label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-transparent px-2 py-1.5 hover:bg-foreground/5">
						<RadioGroupItem value="silence" className="mt-0.5" />
						<span className="min-w-0 flex-1">
							<span className="block text-xs font-medium">Silence detection</span>
							<span className="text-muted-foreground mt-0.5 block text-[11px] leading-snug">
								Detect quiet gaps directly from the audio.
							</span>
						</span>
					</label>
				</RadioGroup>
				{isLlmMode && (
					<div className="border-t pt-2">
						<p className="text-muted-foreground mb-1 text-[11px] font-medium">
							Smart cut targets
						</p>
						<ConfigCheckbox
							id="llm-pauses"
							label="Long pauses & dead air"
							checked={
								pipeline.llmCutLongPauses ??
								DEFAULT_AUTOCUT_PIPELINE.llmCutLongPauses
							}
							onCheckedChange={(checked) =>
								setPipeline({ llmCutLongPauses: checked })
							}
						/>
						<ConfigCheckbox
							id="llm-fillers"
							label="Filler words (um, uh, like)"
							checked={
								pipeline.llmCutFillers ?? DEFAULT_AUTOCUT_PIPELINE.llmCutFillers
							}
							onCheckedChange={(checked) =>
								setPipeline({ llmCutFillers: checked })
							}
						/>
						<ConfigCheckbox
							id="llm-retakes"
							label="False starts & retakes"
							checked={
								pipeline.llmCutRetakes ?? DEFAULT_AUTOCUT_PIPELINE.llmCutRetakes
							}
							onCheckedChange={(checked) =>
								setPipeline({ llmCutRetakes: checked })
							}
						/>
					</div>
				)}
			</SectionCard>

			<SectionCard
				title="Analysis options"
				description="Control which audio source is used and how cuts are applied."
			>
				<ConfigCheckbox
					id="analyze-main"
					label="Analyze from master track"
					description={
						isLlmMode
							? "Use the main video clip as the source for smart cut planning."
							: "Use the main video clip audio for silence detection."
					}
					checked={pipeline.analyzeFromMain}
					onCheckedChange={(checked) =>
						setPipeline({ analyzeFromMain: checked })
					}
				/>
				<ConfigCheckbox
					id="analyze-audio"
					label="Prefer audio / dub track"
					description="Use the first selected audio clip when master is off."
					checked={pipeline.analyzeFromAudio}
					onCheckedChange={(checked) =>
						setPipeline({ analyzeFromAudio: checked })
					}
				/>
				<ConfigCheckbox
					id="mix-audio"
					label="Mix selected audio for analysis"
					description="Blend all checked audio clips before detecting silences."
					checked={pipeline.mixAudioForAnalysis}
					onCheckedChange={(checked) =>
						setPipeline({ mixAudioForAnalysis: checked })
					}
					disabled={isLlmMode || grouped.audio.length < 2}
				/>
				<Separator />
				<ConfigCheckbox
					id="ripple-timeline"
					label="Ripple timeline"
					description="Shift later clips left to close gaps after cutting."
					checked={pipeline.rippleTimeline}
					onCheckedChange={(checked) =>
						setPipeline({ rippleTimeline: checked })
					}
				/>
			</SectionCard>

			<SectionCard
				title="Cut tuning"
				description="Tune sensitivity, padding, and optional post-cut effects."
			>
				{!isLlmMode && (
					<OptionRow
						label="Silence threshold"
						valueLabel={`${pipeline.thresholdDb} dB`}
					>
						<Slider
							min={-60}
							max={-20}
							step={1}
							value={[pipeline.thresholdDb]}
							onValueChange={([value]) =>
								setPipeline({ thresholdDb: value })
							}
						/>
					</OptionRow>
				)}

				<OptionRow
					label={isLlmMode ? "Minimum cut length" : "Minimum silence"}
					valueLabel={`${pipeline.minSilenceSeconds.toFixed(1)} s`}
				>
					<Slider
						min={0.2}
						max={2}
						step={0.1}
						value={[pipeline.minSilenceSeconds]}
						onValueChange={([value]) =>
							setPipeline({ minSilenceSeconds: value })
						}
					/>
				</OptionRow>

				<OptionRow
					label="Padding"
					valueLabel={`${Math.round(pipeline.paddingSeconds * 1000)} ms`}
				>
					<Slider
						min={0}
						max={0.3}
						step={0.01}
						value={[pipeline.paddingSeconds]}
						onValueChange={([value]) =>
							setPipeline({ paddingSeconds: value })
						}
					/>
				</OptionRow>

				<Separator />

				<ConfigCheckbox
					id="apply-effects"
					label="Apply effects to kept segments"
					checked={pipeline.applyEffectsAfterCut}
					onCheckedChange={(checked) =>
						setPipeline({ applyEffectsAfterCut: checked })
					}
				/>
				{pipeline.applyEffectsAfterCut &&
					availableEffects.map((effect) => (
						<ConfigCheckbox
							key={effect.type}
							id={`effect-${effect.type}`}
							label={effect.name}
							checked={pipeline.selectedEffectTypes.includes(effect.type)}
							onCheckedChange={(checked) =>
								toggleEffect(effect.type, checked)
							}
							disabled={!pipeline.applyEffectsAfterCut}
						/>
					))}
			</SectionCard>

			<SectionCard
				title="Cut results"
				description="Review detected ranges, then apply them to the selected tracks."
			>
				{error ? (
					<p className="text-destructive text-xs leading-snug">{error}</p>
				) : null}

				{silences.length > 0 ? (
					<>
						<div className="rounded-md bg-foreground/5 px-2.5 py-2 text-xs leading-relaxed">
							<span className="font-medium">{silences.length}</span> cut ranges -{" "}
							<span className="font-medium">{formatSeconds(removableSeconds)}</span>{" "}
							of {formatSeconds(analyzedDurationSeconds)} removable
						</div>

						<div className="scrollbar-thin flex max-h-52 flex-col gap-1 overflow-y-auto">
							{silences.map((silence, index) => (
								<div
									key={`${silence.startSeconds}-${index}`}
									className="flex items-center justify-between rounded bg-foreground/5 px-2 py-1 text-[11px] font-mono tabular-nums text-muted-foreground"
								>
									<span>
										{formatSeconds(silence.startSeconds)}
										{" -> "}
										{formatSeconds(silence.endSeconds)}
									</span>
									<span>
										{"-"}
										{formatSeconds(silence.endSeconds - silence.startSeconds)}
									</span>
								</div>
							))}
						</div>

						<Button
							className="w-full"
							variant="secondary"
							disabled={isWorking}
							onClick={handleApply}
						>
							{`Apply cuts to ${enabledCount} track${enabledCount === 1 ? "" : "s"}`}
						</Button>
					</>
				) : (
					<div className="rounded-md border border-dashed px-3 py-6 text-center">
						<p className="text-sm font-medium">No cut results yet</p>
						<p className="text-muted-foreground mt-1 text-xs leading-snug">
							Review your setup, then use the start button above to analyze the
							selected clips.
						</p>
					</div>
				)}
			</SectionCard>
		</>
	);
}
