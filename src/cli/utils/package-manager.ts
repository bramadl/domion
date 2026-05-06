import { createRequire } from "node:module";

declare const __PKG_NAME__: string | undefined;
declare const __PKG_VERSION__: string | undefined;
declare const __PKG_REPOSITORY__: string | undefined;

export function resolvePackageManager() {
	if (typeof __PKG_NAME__ !== "undefined") {
		return {
			__PKG_NAME__: __PKG_NAME__,
			__PKG_VERSION__: __PKG_VERSION__ ?? "?",
			__PKG_REPOSITORY__: __PKG_REPOSITORY__ ?? "",
		};
	}

	try {
		const require = createRequire(import.meta.url);
		const locations = ["../../package.json", "../../../package.json"];
		for (const loc of locations) {
			try {
				const pkg = require(loc);

				const repoUrl =
					typeof pkg.repository === "string"
						? pkg.repository
						: (pkg.repository?.url ?? "");

				return {
					__PKG_NAME__: pkg.name,
					__PKG_VERSION__: pkg.version,
					__PKG_REPOSITORY__: repoUrl,
				};
			} catch {}
		}
	} catch {}

	return {
		__PKG_NAME__: "drimion",
		__PKG_VERSION__: "?",
		__PKG_REPOSITORY__: "",
	};
}
