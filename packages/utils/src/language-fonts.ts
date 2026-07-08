/** Primary dubbing / translation target for this product. */
export const DEFAULT_TARGET_LANGUAGE = "Khmer";

/** UI locale aligned with the Khmer-first workflow. */
export const DEFAULT_UI_LOCALE = "kh-KH";

/**
 * Google Font families for languages that need full Unicode coverage.
 * Keys match {@link LANGUAGES} `code` values.
 */
export const LANGUAGE_GOOGLE_FONTS: Record<string, string> = {
	Khmer: "Noto Sans Khmer",
	Thai: "Noto Sans Thai",
	Chinese: "Noto Sans SC",
	Japanese: "Noto Sans JP",
	Korean: "Noto Sans KR",
	Hindi: "Noto Sans Devanagari",
	Vietnamese: "Noto Sans",
};

export const FALLBACK_LATIN_FONT = "Inter";

/** Khmer Unicode block (U+1780–U+17FF). */
export function containsKhmerScript(text: string): boolean {
	return /[\u1780-\u17FF]/.test(text);
}

export function containsThaiScript(text: string): boolean {
	return /[\u0E00-\u0E7F]/.test(text);
}

export function containsCjkScript(text: string): boolean {
	return /[\u4E00-\u9FFF\u3400-\u4DBF]/.test(text);
}

export function containsHangulScript(text: string): boolean {
	return /[\uAC00-\uD7AF\u1100-\u11FF]/.test(text);
}

export function containsDevanagariScript(text: string): boolean {
	return /[\u0900-\u097F]/.test(text);
}

export function containsVietnameseDiacritics(text: string): boolean {
	return /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(
		text,
	);
}

/** Resolve the best Google Font for a target language name. */
export function resolveGoogleFontForLanguage(language: string): string {
	const normalized = language.trim();
	if (LANGUAGE_GOOGLE_FONTS[normalized]) {
		return LANGUAGE_GOOGLE_FONTS[normalized];
	}
	const match = Object.entries(LANGUAGE_GOOGLE_FONTS).find(([key]) =>
		normalized.toLowerCase().includes(key.toLowerCase()),
	);
	return match?.[1] ?? LANGUAGE_GOOGLE_FONTS[DEFAULT_TARGET_LANGUAGE];
}

/** Pick a font from script detection first, then the target language. */
export function resolveGoogleFontForText({
	text,
	targetLanguage = DEFAULT_TARGET_LANGUAGE,
}: {
	text: string;
	targetLanguage?: string;
}): string {
	if (containsKhmerScript(text)) return LANGUAGE_GOOGLE_FONTS.Khmer;
	if (containsThaiScript(text)) return LANGUAGE_GOOGLE_FONTS.Thai;
	if (containsHangulScript(text)) return LANGUAGE_GOOGLE_FONTS.Korean;
	if (containsDevanagariScript(text)) return LANGUAGE_GOOGLE_FONTS.Hindi;
	if (containsCjkScript(text)) return LANGUAGE_GOOGLE_FONTS.Chinese;
	if (containsVietnameseDiacritics(text)) return LANGUAGE_GOOGLE_FONTS.Vietnamese;
	return resolveGoogleFontForLanguage(targetLanguage);
}

/** Fonts to preload for the Khmer-first editor workflow. */
export function getPriorityGoogleFonts(
	targetLanguage = DEFAULT_TARGET_LANGUAGE,
): string[] {
	const primary = resolveGoogleFontForLanguage(targetLanguage);
	return [...new Set([primary, LANGUAGE_GOOGLE_FONTS.Khmer, FALLBACK_LATIN_FONT])];
}

export function isKhmerTargetLanguage(language: string): boolean {
	return /khmer|ខ្មែរ/i.test(language);
}
