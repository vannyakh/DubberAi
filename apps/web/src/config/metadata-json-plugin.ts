import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { serializeManifest } from "./apply-app-metadata";

/**
 * Serve repo-root metadata.json and a generated manifest.json in dev,
 * and copy both into dist/ on production builds.
 */
export function metadataJsonPlugin({
	metadataPath,
}: {
	metadataPath: string;
}): Plugin {
	const manifestBody = serializeManifest();

	return {
		name: "dubbercut-metadata-json",
		enforce: "pre",
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (req.url === "/metadata.json") {
					res.setHeader("Content-Type", "application/json");
					res.end(fs.readFileSync(metadataPath));
					return;
				}
				if (req.url === "/manifest.json") {
					res.setHeader("Content-Type", "application/manifest+json");
					res.end(manifestBody);
					return;
				}
				next();
			});
		},
		generateBundle() {
			this.emitFile({
				type: "asset",
				fileName: "metadata.json",
				source: fs.readFileSync(metadataPath, "utf-8"),
			});
			this.emitFile({
				type: "asset",
				fileName: "manifest.json",
				source: manifestBody,
			});
		},
	};
}

export function resolveRepoMetadataPath(rootDir: string): string {
	return path.resolve(rootDir, "metadata.json");
}
