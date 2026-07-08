import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import { cn } from "@/utils/ui";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2 } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ScissorIcon } from "@hugeicons/core-free-icons";
import {
	isAutoCutBusy,
	useAutoCutStore,
	type AutoCutStatus,
} from "../autocut-store";
import { DEFAULT_AUTOCUT_PIPELINE } from "../config";

function StepIcon({
	done,
	active,
}: {
	done: boolean;
	active: boolean;
}) {
	if (done) {
		return <CheckCircle2 className="text-primary size-4 shrink-0" />;
	}
	if (active) {
		return <Spinner className="size-4 shrink-0" />;
	}
	return (
		<span className="border-muted-foreground/40 size-4 shrink-0 rounded-full border" />
	);
}

function AutoCutCanvasBackground({
	progressPercent,
}: {
	progressPercent: number;
}) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const progressRef = useRef(progressPercent);

	progressRef.current = progressPercent;

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let rafId = 0;
		let startTime = performance.now();

		const particles = Array.from({ length: 22 }, (_, index) => ({
			x: (index * 47) % 100,
			y: (index * 29) % 100,
			size: 1.5 + (index % 5),
			speedX: ((index % 3) - 1) * 0.018,
			speedY: (((index + 1) % 3) - 1) * 0.014,
			alpha: 0.12 + (index % 4) * 0.04,
		}));

		const resize = () => {
			const dpr = window.devicePixelRatio || 1;
			canvas.width = Math.floor(window.innerWidth * dpr);
			canvas.height = Math.floor(window.innerHeight * dpr);
			canvas.style.width = `${window.innerWidth}px`;
			canvas.style.height = `${window.innerHeight}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};

		const draw = (now: number) => {
			const width = window.innerWidth;
			const height = window.innerHeight;
			const elapsed = (now - startTime) * 0.001;
			const progress = Math.max(0, Math.min(1, progressRef.current / 100));
			const energy = 0.35 + progress * 0.95;
			const drift = 1 + progress * 1.4;

			ctx.clearRect(0, 0, width, height);

			const gradient = ctx.createLinearGradient(0, 0, width, height);
			gradient.addColorStop(0, `rgba(33, 157, 255, ${0.12 + progress * 0.18})`);
			gradient.addColorStop(0.5, `rgba(96, 79, 255, ${0.06 + progress * 0.1})`);
			gradient.addColorStop(1, `rgba(91, 189, 89, ${0.08 + progress * 0.16})`);
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, width, height);

			ctx.save();
			ctx.strokeStyle = `rgba(80, 170, 255, ${0.05 + progress * 0.1})`;
			ctx.lineWidth = 1;
			for (let x = 0; x < width; x += 48) {
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, height);
				ctx.stroke();
			}
			for (let y = 0; y < height; y += 48) {
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(width, y);
				ctx.stroke();
			}
			ctx.restore();

			for (const particle of particles) {
				particle.x += particle.speedX * drift;
				particle.y += particle.speedY * drift;

				if (particle.x < -10) particle.x = 110;
				if (particle.x > 110) particle.x = -10;
				if (particle.y < -10) particle.y = 110;
				if (particle.y > 110) particle.y = -10;

				const px = (particle.x / 100) * width;
				const py = (particle.y / 100) * height;
				const pulse =
					0.7 +
					Math.sin(elapsed * (1.6 + progress * 1.8) + particle.size) *
						(0.2 + progress * 0.18);

				ctx.beginPath();
				ctx.fillStyle = `rgba(82, 185, 255, ${particle.alpha * pulse * energy})`;
				ctx.arc(
					px,
					py,
					particle.size * (0.85 + progress * 0.65) * pulse,
					0,
					Math.PI * 2,
				);
				ctx.fill();
			}

			const ringRadius =
				Math.min(width, height) * (0.14 + progress * 0.18) +
				Math.sin(elapsed * 1.4) * 12;
			ctx.beginPath();
			ctx.strokeStyle = `rgba(80, 170, 255, ${0.04 + progress * 0.12})`;
			ctx.lineWidth = 1.5 + progress * 1.5;
			ctx.arc(width * 0.5, height * 0.45, ringRadius, 0, Math.PI * 2);
			ctx.stroke();

			const glow = ctx.createRadialGradient(
				width * 0.5,
				height * 0.45,
				0,
				width * 0.5,
				height * 0.45,
				Math.min(width, height) * (0.3 + progress * 0.22),
			);
			glow.addColorStop(0, `rgba(255,255,255,${0.04 + progress * 0.12})`);
			glow.addColorStop(1, "rgba(255,255,255,0)");
			ctx.fillStyle = glow;
			ctx.fillRect(0, 0, width, height);

			rafId = window.requestAnimationFrame(draw);
		};

		resize();
		rafId = window.requestAnimationFrame(draw);
		window.addEventListener("resize", resize);

		return () => {
			window.cancelAnimationFrame(rafId);
			window.removeEventListener("resize", resize);
		};
	}, []);

	return (
		<canvas
			ref={canvasRef}
			className="pointer-events-none absolute inset-0 opacity-95"
			aria-hidden="true"
		/>
	);
}

export function AutoCutOverlay() {
	const {
		status,
		pipeline,
		pipelineSteps,
		pipelineStepIndex,
		pipelineProgress,
		error,
	} = useAutoCutStore();

	const detectionMode =
		pipeline.detectionMode ?? DEFAULT_AUTOCUT_PIPELINE.detectionMode;
	const busy = isAutoCutBusy(status);

	if (!busy && status !== "error") return null;

	const progressPercent =
		pipelineProgress && pipelineProgress.total > 0
			? Math.round(
					(pipelineProgress.current / pipelineProgress.total) * 100,
				)
			: pipelineSteps.length > 0 && pipelineStepIndex >= 0
				? Math.round(
						((pipelineStepIndex + 1) / pipelineSteps.length) * 100,
					)
				: null;

	return createPortal(
		<div
			className="fixed inset-0 z-[200] flex items-center justify-center bg-background/82 backdrop-blur-md"
			role="dialog"
			aria-modal="true"
			aria-busy={busy}
			aria-label="Auto Cut pipeline"
			onPointerDown={(event) => event.stopPropagation()}
		>
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<AutoCutCanvasBackground progressPercent={progressPercent ?? 0} />
			</div>

			<div className="autocut-modal relative mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-card/94 p-6 shadow-2xl pointer-events-auto">
				<div className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-br from-primary/8 via-transparent to-transparent opacity-80" />
				<div className="relative mb-5 flex items-center gap-3">
					<div className="autocut-icon-wrap bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
						<HugeiconsIcon icon={ScissorIcon} className="size-5" />
					</div>
					<div>
						<p className="text-sm font-semibold">Auto Cut</p>
						<p className="text-muted-foreground text-xs">
							{statusLabel(status, detectionMode)}
						</p>
					</div>
				</div>

				{progressPercent !== null && (
					<div className="relative mb-4 flex flex-col gap-1.5">
						<div className="flex items-center justify-between text-[11px] text-muted-foreground">
							<span>Pipeline progress</span>
							<span className="font-mono tabular-nums">{progressPercent}%</span>
						</div>
						<Progress value={progressPercent} className="h-1.5" />
					</div>
				)}

				<ul className="relative flex flex-col gap-2">
					{pipelineSteps.map((step, index) => {
						const done = pipelineStepIndex > index;
						const active = pipelineStepIndex === index && busy;
						return (
							<li
								key={step}
								className={cn(
									"flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-all duration-300",
									active && "bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_rgba(80,170,255,0.12)]",
									done && "text-muted-foreground",
									!done && !active && "text-muted-foreground/70",
								)}
							>
								<StepIcon done={done} active={active} />
								<span className="min-w-0 flex-1 leading-snug">{step}</span>
								{active &&
									pipelineProgress &&
									pipelineProgress.total > 1 && (
										<span className="font-mono text-[10px] tabular-nums text-muted-foreground">
											{pipelineProgress.current}/{pipelineProgress.total}
										</span>
									)}
							</li>
						);
					})}
				</ul>

				{error && status === "error" ? (
					<div className="mt-4 flex flex-col gap-2">
						<p className="text-destructive text-xs leading-snug">{error}</p>
						<button
							type="button"
							className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-3 py-1.5 text-xs font-medium"
							onClick={() => {
								useAutoCutStore.getState().setError(null);
								useAutoCutStore.getState().clearPipeline();
							}}
						>
							Dismiss
						</button>
					</div>
				) : (
					<p className="text-muted-foreground mt-4 text-[11px] leading-snug">
						Editor controls are paused while Auto Cut runs. This may take a
						moment for longer clips.
					</p>
				)}
			</div>
		</div>,
		document.body,
	);
}

function statusLabel(
	status: AutoCutStatus,
	detectionMode: string,
): string {
	if (status === "applying") return "Applying cuts to the timeline…";
	if (status === "analyzing") {
		return detectionMode === "llm"
			? "Preparing smart cut plan"
			: "Analyzing audio silence";
	}
	if (status === "error") return "Auto Cut failed";
	return "Processing…";
}
