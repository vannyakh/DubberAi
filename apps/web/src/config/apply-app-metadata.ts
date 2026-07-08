import {
	appMetadata,
	buildFramePermissionsPolicy,
	buildWebManifest,
} from "./app-metadata";

function upsertMeta({
	name,
	content,
}: {
	name: string;
	content: string;
}): void {
	let element = document.querySelector(`meta[name="${name}"]`);
	if (!element) {
		element = document.createElement("meta");
		element.setAttribute("name", name);
		document.head.appendChild(element);
	}
	element.setAttribute("content", content);
}

function upsertHttpEquivMeta({
	name,
	content,
}: {
	name: string;
	content: string;
}): void {
	let element = document.querySelector(`meta[http-equiv="${name}"]`);
	if (!element) {
		element = document.createElement("meta");
		element.setAttribute("http-equiv", name);
		document.head.appendChild(element);
	}
	element.setAttribute("content", content);
}

/** Apply repo-root metadata.json to the live document (title, SEO, permissions). */
export function applyAppMetadata(): void {
	document.title = appMetadata.name;
	upsertMeta({ name: "description", content: appMetadata.description });
	upsertMeta({ name: "application-name", content: appMetadata.name });
	upsertHttpEquivMeta({
		name: "Permissions-Policy",
		content: buildFramePermissionsPolicy(),
	});
}

/** Build-time helper for Vite to emit manifest.json from metadata.json. */
export function serializeManifest(): string {
	return `${JSON.stringify(buildWebManifest(), null, "\t")}\n`;
}
