/**
 * Minimal stand-in for `next/image` used by code ported from OpenCut.
 * Renders a plain <img>; `fill` maps to absolute positioning like Next does,
 * and Next-specific props (`unoptimized`, `sizes`, `priority`) are dropped.
 */
import type { CSSProperties, ImgHTMLAttributes } from "react";

interface NextImageProps
	extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
	src: string;
	fill?: boolean;
	unoptimized?: boolean;
	priority?: boolean;
}

export default function Image({
	fill,
	unoptimized: _unoptimized,
	priority: _priority,
	style,
	...props
}: NextImageProps) {
	const fillStyle: CSSProperties | undefined = fill
		? {
				position: "absolute",
				inset: 0,
				width: "100%",
				height: "100%",
				...style,
			}
		: style;
	return <img {...props} style={fillStyle} />;
}
