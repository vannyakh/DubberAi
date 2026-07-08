import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
	isDubbingBusy,
	useDubbingStore,
	type DubbingStatus,
} from "../dubbing-store";

function statusCopy(status: DubbingStatus): string {
	switch (status) {
		case "transcribing":
			return "Transcribing…";
		case "translating":
			return "Translating…";
		case "speaking":
			return "Generating vocals…";
		case "applying":
			return "Adding to timeline…";
		case "error":
			return "Dubbing failed";
		default:
			return "Working…";
	}
}

function DubbingOrb({ percent }: { percent: number }) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const percentRef = useRef(percent);
	percentRef.current = percent;

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let rafId = 0;
		const size = 220;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = size * dpr;
		canvas.height = size * dpr;
		canvas.style.width = `${size}px`;
		canvas.style.height = `${size}px`;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const start = performance.now();
		const draw = (now: number) => {
			const t = (now - start) * 0.001;
			const p = Math.max(0, Math.min(1, percentRef.current / 100));
			ctx.clearRect(0, 0, size, size);

			const cx = size / 2;
			const cy = size / 2;
			const radius = 58 + p * 10;

			const halo = ctx.createRadialGradient(cx, cy, 10, cx, cy, 108);
			halo.addColorStop(0, `rgba(80, 210, 255, ${0.45 + p * 0.35})`);
			halo.addColorStop(0.45, `rgba(90, 110, 255, ${0.28 + p * 0.25})`);
			halo.addColorStop(1, "rgba(10, 12, 20, 0)");
			ctx.fillStyle = halo;
			ctx.beginPath();
			ctx.arc(cx, cy, 108, 0, Math.PI * 2);
			ctx.fill();

			const orb = ctx.createRadialGradient(
				cx - 18,
				cy - 22,
				8,
				cx,
				cy,
				radius,
			);
			orb.addColorStop(0, "#dff8ff");
			orb.addColorStop(0.28, "#4fd6ff");
			orb.addColorStop(0.58, "#5b6dff");
			orb.addColorStop(1, "#1b1640");
			ctx.fillStyle = orb;
			ctx.beginPath();
			ctx.arc(cx, cy, radius, 0, Math.PI * 2);
			ctx.fill();

			ctx.save();
			ctx.globalCompositeOperation = "lighter";
			for (let i = 0; i < 10; i++) {
				const angle = t * (0.8 + i * 0.07) + i * 0.7;
				const orbit = radius * (0.35 + (i % 4) * 0.12);
				const x = cx + Math.cos(angle) * orbit;
				const y = cy + Math.sin(angle * 1.15) * orbit * 0.78;
				ctx.beginPath();
				ctx.fillStyle = `rgba(180, 240, 255, ${0.18 + (i % 3) * 0.08})`;
				ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.restore();

			ctx.beginPath();
			ctx.strokeStyle = `rgba(170, 230, 255, ${0.22 + p * 0.25})`;
			ctx.lineWidth = 2;
			ctx.arc(cx, cy, radius + 10 + Math.sin(t * 2) * 3, 0, Math.PI * 2);
			ctx.stroke();

			rafId = window.requestAnimationFrame(draw);
		};

		rafId = window.requestAnimationFrame(draw);
		return () => window.cancelAnimationFrame(rafId);
	}, []);

	return (
		<div className="relative flex size-[220px] items-center justify-center">
			<canvas ref={canvasRef} className="absolute inset-0" aria-hidden />
			<span className="relative z-10 text-[42px] font-semibold italic tracking-tight text-white drop-shadow-[0_0_18px_rgba(120,200,255,0.55)]">
				{Math.round(percent)}%
			</span>
		</div>
	);
}

export function DubbingOverlay() {
	const { status, error, progress, overlayPercent, cancelJob, setError } =
		useDubbingStore();
	const busy = isDubbingBusy(status);

	if (!busy && status !== "error") return null;

	const clipPercent =
		progress && progress.total > 0
			? Math.round((progress.current / progress.total) * 100)
			: null;
	const percent = Math.max(
		0,
		Math.min(100, clipPercent ?? overlayPercent ?? 0),
	);

	return createPortal(
		<div
			className="fixed inset-0 z-[200] flex items-center justify-center bg-[#141418]/96 backdrop-blur-md"
			role="dialog"
			aria-modal="true"
			aria-busy={busy}
			aria-label="Dubbing progress"
			onPointerDown={(event) => event.stopPropagation()}
		>
			<div className="relative flex flex-col items-center gap-5 px-6">
				{busy ? <DubbingOrb percent={percent} /> : null}

				{status === "error" ? (
					<div className="flex max-w-sm flex-col items-center gap-4 text-center">
						<p className="text-sm font-medium text-white">Dubbing failed</p>
						<p className="text-xs leading-relaxed text-white/65">
							{error || "Something went wrong while dubbing."}
						</p>
						<Button
							variant="secondary"
							className="min-w-28"
							onClick={() => setError(null)}
						>
							Dismiss
						</Button>
					</div>
				) : (
					<>
						<p className="text-base font-medium tracking-wide text-white">
							{statusCopy(status)}
						</p>
						{progress && progress.total > 1 ? (
							<p className="font-mono text-xs text-white/55">
								{progress.current}/{progress.total} lines
							</p>
						) : null}
						<Button
							variant="secondary"
							className="min-w-28 rounded-md bg-white/10 text-white hover:bg-white/15"
							onClick={() => cancelJob()}
						>
							Cancel
						</Button>
					</>
				)}
			</div>
		</div>,
		document.body,
	);
}
