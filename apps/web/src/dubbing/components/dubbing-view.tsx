"use client";

import { useMemo, useState } from "react";
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
import type { MediaAsset } from "@/media/types";
import { VOICES, LANGUAGES } from "@dubbercut/utils";
import type { Segment } from "@dubbercut/types";
import { toast } from "sonner";
import { cn } from "@/utils/ui";
import { useDubbingStore } from "../dubbing-store";
import {
	runFullDub,
	runTranscription,
	runTranslation,
	runSpeechAndApply,
} from "../run-dub";

const STATUS_LABELS: Record<string, string> = {
	transcribing: "Transcribing dialogue…",
	translating: "Translating…",
	speaking: "Generating speech…",
	applying: "Adding to timeline…",
};

function formatSegmentTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function SegmentList({ segments }: { segments: Segment[] }) {
	return (
		<div className="flex flex-col gap-1.5">
			{segments.map((segment, index) => (
				<div
					key={`${segment.time}-${index}`}
					className="rounded-md bg-foreground/5 px-2.5 py-1.5 text-xs"
				>
					<div className="mb-0.5 flex items-center gap-2 text-muted-foreground">
						<span className="font-mono">
							{formatSegmentTime(segment.time)}
						</span>
						<span>{segment.speaker}</span>
					</div>
					<p className="leading-snug">{segment.text}</p>
				</div>
			))}
		</div>
	);
}

export function DubbingView() {
	const editor = useEditor();
	const assets = useEditor((e) => e.media.getAssets());
	const videoAssets = useMemo(
		() => assets.filter((asset: MediaAsset) => asset.type === "video"),
		[assets],
	);

	const {
		status,
		error,
		progress,
		sourceAssetId,
		targetLang,
		detectedLanguage,
		transcriptSegments,
		translationSegments,
		speakerVoices,
		defaultVoice,
		setSourceAssetId,
		setTargetLang,
		setSpeakerVoice,
		setDefaultVoice,
		reset,
	} = useDubbingStore();

	const [busy, setBusy] = useState(false);
	const isWorking =
		busy || (status !== "idle" && status !== "done" && status !== "error");

	const selectedAsset =
		videoAssets.find((asset) => asset.id === sourceAssetId) ??
		videoAssets[0] ??
		null;

	const speakers = useMemo(() => {
		const names = new Set<string>();
		for (const segment of transcriptSegments) names.add(segment.speaker);
		for (const segment of translationSegments) names.add(segment.speaker);
		return [...names];
	}, [transcriptSegments, translationSegments]);

	const guard = async (fn: () => Promise<void>, doneMessage?: string) => {
		if (!selectedAsset) {
			toast.error("Import a video in the Media tab first");
			return;
		}
		setBusy(true);
		try {
			await fn();
			if (doneMessage) toast.success(doneMessage);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Dubbing step failed",
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<PanelView>
			<ScrollArea className="h-full">
				<div className="flex flex-col gap-4 p-3">
					<div className="flex flex-col gap-2">
						<span className="text-xs font-medium text-muted-foreground">
							Source video
						</span>
						<Select
							value={selectedAsset?.id ?? ""}
							onValueChange={setSourceAssetId}
							disabled={videoAssets.length === 0}
						>
							<SelectTrigger className="w-full">
								<SelectValue
									placeholder={
										videoAssets.length === 0
											? "No videos imported"
											: "Select a video"
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{videoAssets.map((asset) => (
									<SelectItem key={asset.id} value={asset.id}>
										{asset.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

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
								() =>
									runFullDub({ editor, asset: selectedAsset! }),
								"Dub added to timeline",
							)
						}
					>
						{isWorking
							? `${STATUS_LABELS[status] ?? "Working…"}${
									progress
										? ` ${progress.current}/${progress.total}`
										: ""
								}`
							: "Dub video"}
					</Button>

					<div className="grid grid-cols-3 gap-1.5">
						<Button
							variant="outline"
							size="sm"
							disabled={isWorking || !selectedAsset}
							onClick={() =>
								guard(() =>
									runTranscription({ asset: selectedAsset! }),
								)
							}
						>
							Transcribe
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={isWorking || transcriptSegments.length === 0}
							onClick={() => guard(() => runTranslation())}
						>
							Translate
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={isWorking || translationSegments.length === 0}
							onClick={() =>
								guard(
									() => runSpeechAndApply({ editor }),
									"Dub added to timeline",
								)
							}
						>
							Voice + apply
						</Button>
					</div>

					{error ? (
						<p className="rounded-md bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
							{error}
						</p>
					) : null}

					{speakers.length > 0 ? (
						<div className="flex flex-col gap-2">
							<span className="text-xs font-medium text-muted-foreground">
								Speaker voices
							</span>
							{speakers.map((speaker) => (
								<div
									key={speaker}
									className="flex items-center justify-between gap-2"
								>
									<span className="truncate text-xs">{speaker}</span>
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
							<div className="flex items-center justify-between">
								<span className="text-xs font-medium text-muted-foreground">
									Transcript
									{detectedLanguage ? ` (${detectedLanguage})` : ""}
								</span>
								<button
									type="button"
									className={cn(
										"text-xs text-muted-foreground underline-offset-2 hover:underline",
										isWorking && "pointer-events-none opacity-50",
									)}
									onClick={reset}
								>
									Clear
								</button>
							</div>
							<SegmentList segments={transcriptSegments} />
						</div>
					) : null}

					{translationSegments.length > 0 ? (
						<div className="flex flex-col gap-2">
							<span className="text-xs font-medium text-muted-foreground">
								Translation ({targetLang})
							</span>
							<SegmentList segments={translationSegments} />
						</div>
					) : null}
				</div>
			</ScrollArea>
		</PanelView>
	);
}
