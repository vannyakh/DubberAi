import { useState } from "react";
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
import { Slider } from "@/components/ui/slider";
import { useEditor } from "@/editor/use-editor";
import { toast } from "sonner";
import { useAutoCutStore } from "../autocut-store";
import { runSilenceDetection, runApplyCuts } from "../run-autocut";
import { listCuttableElements } from "../apply-cuts";
import { totalSilenceSeconds } from "../silence";

function formatSeconds(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return m > 0 ? `${m}m ${s.toFixed(1)}s` : `${s.toFixed(1)}s`;
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

export function AutoCutView() {
	const editor = useEditor();
	// Subscribe to timeline changes (string keys keep the snapshot stable)
	// so the clip list below stays current.
	useEditor((e) =>
		listCuttableElements({ editor: e }).map(
			(item) => `${item.trackId}:${item.element.id}:${item.element.name}`,
		),
	);
	const {
		status,
		error,
		options,
		target,
		silences,
		analyzedDurationSeconds,
		setOptions,
		setTarget,
	} = useAutoCutStore();
	const [busy, setBusy] = useState(false);

	const clips = listCuttableElements({ editor });
	const selected =
		(target &&
			clips.find(
				(clip) =>
					clip.trackId === target.trackId &&
					clip.element.id === target.elementId,
			)) ??
		clips[0] ??
		null;
	const selectedKey = selected
		? `${selected.trackId}:${selected.element.id}`
		: "";

	const isWorking = busy || status === "analyzing" || status === "applying";
	const removableSeconds = totalSilenceSeconds({ silences });

	const handleDetect = async () => {
		if (!selected) {
			toast.error("Add a video or audio clip to the timeline first");
			return;
		}
		if (
			!target ||
			target.elementId !== selected.element.id ||
			target.trackId !== selected.trackId
		) {
			setTarget({
				trackId: selected.trackId,
				elementId: selected.element.id,
			});
		}
		setBusy(true);
		try {
			await runSilenceDetection({ editor });
			const found = useAutoCutStore.getState().silences.length;
			if (found === 0) {
				toast.info("No silences found with the current settings");
			}
		} catch {
			// error already surfaced via store + toast below
		} finally {
			setBusy(false);
		}
	};

	const handleApply = () => {
		setBusy(true);
		try {
			const result = runApplyCuts({ editor });
			if (result) {
				toast.success(
					`Removed ${formatSeconds(result.removedSeconds)} of silence (${result.segmentCount} segments kept)`,
				);
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Auto-cut failed");
		} finally {
			setBusy(false);
		}
	};

	return (
		<PanelView>
			<ScrollArea className="h-full">
				<div className="flex flex-col gap-4 p-3">
					<p className="text-xs text-muted-foreground leading-relaxed">
						Detects silent parts of a clip with AI-tuned level analysis, then
						cuts them out and closes the gaps — one undoable edit.
					</p>

					<div className="flex flex-col gap-2">
						<span className="text-xs font-medium text-muted-foreground">
							Clip
						</span>
						<Select
							value={selectedKey}
							onValueChange={(value) => {
								const [trackId, elementId] = value.split(":");
								setTarget({ trackId, elementId });
							}}
							disabled={clips.length === 0}
						>
							<SelectTrigger className="w-full">
								<SelectValue
									placeholder={
										clips.length === 0
											? "No cuttable clips on the timeline"
											: "Select a clip"
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{clips.map((clip) => (
									<SelectItem
										key={`${clip.trackId}:${clip.element.id}`}
										value={`${clip.trackId}:${clip.element.id}`}
									>
										{clip.element.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<OptionRow
						label="Silence threshold"
						valueLabel={`${options.thresholdDb} dB`}
					>
						<Slider
							min={-60}
							max={-20}
							step={1}
							value={[options.thresholdDb]}
							onValueChange={([value]) => setOptions({ thresholdDb: value })}
						/>
					</OptionRow>

					<OptionRow
						label="Minimum silence"
						valueLabel={`${options.minSilenceSeconds.toFixed(1)} s`}
					>
						<Slider
							min={0.2}
							max={2}
							step={0.1}
							value={[options.minSilenceSeconds]}
							onValueChange={([value]) =>
								setOptions({ minSilenceSeconds: value })
							}
						/>
					</OptionRow>

					<OptionRow
						label="Padding"
						valueLabel={`${Math.round(options.paddingSeconds * 1000)} ms`}
					>
						<Slider
							min={0}
							max={0.3}
							step={0.01}
							value={[options.paddingSeconds]}
							onValueChange={([value]) =>
								setOptions({ paddingSeconds: value })
							}
						/>
					</OptionRow>

					<Button
						className="w-full"
						disabled={isWorking || !selected}
						onClick={handleDetect}
					>
						{status === "analyzing" ? "Analyzing audio…" : "Detect silences"}
					</Button>

					{error && (
						<p className="text-xs text-destructive leading-snug">{error}</p>
					)}

					{silences.length > 0 && (
						<>
							<div className="rounded-md bg-foreground/5 px-2.5 py-2 text-xs leading-relaxed">
								<span className="font-medium">{silences.length}</span>{" "}
								silences found —{" "}
								<span className="font-medium">
									{formatSeconds(removableSeconds)}
								</span>{" "}
								of {formatSeconds(analyzedDurationSeconds)} will be removed
							</div>

							<div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
								{silences.map((silence, index) => (
									<div
										key={`${silence.startSeconds}-${index}`}
										className="flex items-center justify-between rounded bg-foreground/5 px-2 py-1 text-[11px] font-mono tabular-nums text-muted-foreground"
									>
										<span>
											{formatSeconds(silence.startSeconds)} →{" "}
											{formatSeconds(silence.endSeconds)}
										</span>
										<span>
											−
											{formatSeconds(
												silence.endSeconds - silence.startSeconds,
											)}
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
								{status === "applying"
									? "Cutting…"
									: `Cut ${silences.length} silences`}
							</Button>
						</>
					)}
				</div>
			</ScrollArea>
		</PanelView>
	);
}
