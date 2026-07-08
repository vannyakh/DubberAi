import raw from "../../../../metadata.json";

export type FramePermission = "camera" | "microphone";

export type MajorCapability = "MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API";

export interface AppMetadata {
	name: string;
	description: string;
	requestFramePermissions: FramePermission[];
	majorCapabilities: MajorCapability[];
}

/** Repo-root metadata.json — single source of truth for app identity. */
export const appMetadata = raw as AppMetadata;

export const usesServerSideGeminiApi = appMetadata.majorCapabilities.includes(
	"MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API",
);

export function buildFramePermissionsPolicy(
	permissions: readonly string[] = appMetadata.requestFramePermissions,
): string {
	return permissions.map((permission) => `${permission}=(self)`).join(", ");
}

export function buildWebManifest(): Record<string, unknown> {
	return {
		name: appMetadata.name,
		description: appMetadata.description,
		display: "standalone",
		start_url: "/",
		icons: [
			{
				src: "/icons/android-icon-36x36.png",
				sizes: "36x36",
				type: "image/png",
				density: "0.75",
			},
			{
				src: "/icons/android-icon-48x48.png",
				sizes: "48x48",
				type: "image/png",
				density: "1.0",
			},
			{
				src: "/icons/android-icon-72x72.png",
				sizes: "72x72",
				type: "image/png",
				density: "1.5",
			},
			{
				src: "/icons/android-icon-96x96.png",
				sizes: "96x96",
				type: "image/png",
				density: "2.0",
			},
			{
				src: "/icons/android-icon-144x144.png",
				sizes: "144x144",
				type: "image/png",
				density: "3.0",
			},
			{
				src: "/icons/android-icon-192x192.png",
				sizes: "192x192",
				type: "image/png",
				density: "4.0",
			},
		],
	};
}
