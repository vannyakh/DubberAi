import {
	DEFAULT_TARGET_LANGUAGE,
	getPriorityGoogleFonts,
	resolveGoogleFontForLanguage,
	resolveGoogleFontForText,
} from "@dubbercut/utils";
import { loadFonts, loadFullFont } from "@/fonts/google-fonts";

const ensuredFamilies = new Set<string>();

export async function ensureGoogleFont(family: string): Promise<void> {
	if (ensuredFamilies.has(family)) return;
	await loadFullFont({ family });
	ensuredFamilies.add(family);
}

export async function ensureFontsForLanguage(
	language: string = DEFAULT_TARGET_LANGUAGE,
): Promise<string> {
	const family = resolveGoogleFontForLanguage(language);
	await ensureGoogleFont(family);
	return family;
}

export async function ensureFontsForText({
	text,
	targetLanguage = DEFAULT_TARGET_LANGUAGE,
}: {
	text: string;
	targetLanguage?: string;
}): Promise<string> {
	const family = resolveGoogleFontForText({ text, targetLanguage });
	await ensureGoogleFont(family);
	return family;
}

export async function ensureFontsForTexts({
	texts,
	targetLanguage = DEFAULT_TARGET_LANGUAGE,
}: {
	texts: string[];
	targetLanguage?: string;
}): Promise<void> {
	const families = new Set<string>(getPriorityGoogleFonts(targetLanguage));
	const textSamples: Record<string, string> = {};
	for (const text of texts) {
		const family = resolveGoogleFontForText({ text, targetLanguage });
		families.add(family);
		textSamples[family] = `${textSamples[family] ?? ""}${text.slice(0, 80)}`;
	}
	await loadFonts({
		families: [...families],
		textSamples,
	});
	for (const family of families) {
		ensuredFamilies.add(family);
	}
}

/** Preload Khmer + target-language fonts when the editor boots. */
export async function ensurePriorityLanguageFonts(
	targetLanguage = DEFAULT_TARGET_LANGUAGE,
): Promise<void> {
	await loadFonts({ families: getPriorityGoogleFonts(targetLanguage) });
	for (const family of getPriorityGoogleFonts(targetLanguage)) {
		ensuredFamilies.add(family);
	}
}

export { getPriorityGoogleFonts, resolveGoogleFontForText };
