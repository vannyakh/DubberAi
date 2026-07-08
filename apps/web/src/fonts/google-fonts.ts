import type { FontAtlas } from "@/fonts/types";
import { SYSTEM_FONTS } from "@/fonts/system-fonts";

const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com/css2";
const FONT_ATLAS_PATH = "/fonts/font-atlas.json";
const FONT_CHUNK_PATH_PREFIX = "/fonts/font-chunk-";

const fullLoaded = new Set<string>();

let cachedAtlas: FontAtlas | null = null;
let atlasFetchPromise: Promise<FontAtlas | null> | null = null;

function encodeGoogleFontsFamily(family: string): string {
	return family.replace(/ /g, "+");
}

export function getCachedFontAtlas(): FontAtlas | null {
	return cachedAtlas;
}

export function clearFontAtlasCache(): void {
	cachedAtlas = null;
	atlasFetchPromise = null;
	fullLoaded.clear();
}

export function loadFontAtlas(): Promise<FontAtlas | null> {
	if (cachedAtlas) return Promise.resolve(cachedAtlas);
	if (atlasFetchPromise) return atlasFetchPromise;

	atlasFetchPromise = fetch(FONT_ATLAS_PATH)
		.then(async (response) => {
			if (!response.ok) return null;
			const data: FontAtlas = await response.json();
			cachedAtlas = data;
			preloadChunkImages({ atlas: data });
			return data;
		})
		.catch(() => null);

	return atlasFetchPromise;
}

function preloadChunkImages({ atlas }: { atlas: FontAtlas }): void {
	const maxChunk = Math.max(
		...Object.values(atlas.fonts).map((entry) => entry.ch),
	);
	for (let i = 0; i <= maxChunk; i++) {
		// hint browser to preload chunk images without blocking
		const img = new Image();
		img.src = `${FONT_CHUNK_PATH_PREFIX}${i}.avif`;
	}
}

export async function loadFullFont({
	family,
	weights = [400, 700],
	textSample,
}: {
	family: string;
	weights?: number[];
	/** Optional Unicode sample — helps Google Fonts serve the right glyphs. */
	textSample?: string;
}): Promise<void> {
	if (fullLoaded.has(family)) return;

	const familyParam = encodeGoogleFontsFamily(family);
	const weightParam = `:wght@${weights.join(";")}`;
	const textParam =
		textSample && textSample.length > 0
			? `&text=${encodeURIComponent(textSample.slice(0, 120))}`
			: family.includes("Khmer")
				? "&text=" + encodeURIComponent("ខ្មែរភាសាខ្មែរ ABCDEFG")
				: "";

	const url = `${GOOGLE_FONTS_CSS}?family=${familyParam}${weightParam}${textParam}&display=swap`;
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = url;
	document.head.appendChild(link);
	await new Promise<void>((resolve) => {
		link.addEventListener("load", () => resolve(), { once: true });
		link.addEventListener("error", () => resolve(), { once: true });
	});
	await Promise.all(
		weights.map((weight) =>
			document.fonts.load(`${weight} 16px "${family.replace(/"/g, '\\"')}"`),
		),
	);
	fullLoaded.add(family);
}

export async function loadFonts({
	families,
	textSamples,
}: {
	families: string[];
	textSamples?: Record<string, string>;
}): Promise<void> {
	const googleFonts = families.filter((family) => !SYSTEM_FONTS.has(family));
	await Promise.all(
		googleFonts.map((family) =>
			loadFullFont({
				family,
				textSample: textSamples?.[family],
			}),
		),
	);
}
