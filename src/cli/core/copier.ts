import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { resolvePackageManager } from "../utils/package-manager";

const { __PKG_VERSION__ } = resolvePackageManager();

/** biome-ignore lint/complexity/noStaticOnlyClass: No instantiation is needed */
export class Copier {
	static async copyKernel(targetPath: string): Promise<void> {
		const __dirname = path.dirname(fileURLToPath(import.meta.url));

		const source = path.resolve(__dirname, "..", "..", "kernel");

		const sourceExists = await fs.pathExists(source);
		if (!sourceExists) {
			throw new Error(
				`Kernel source not found at: ${source}\nMake sure build step copied kernel into dist.`,
			);
		}

		const targetExists = await fs.pathExists(targetPath);
		if (targetExists) {
			throw new Error(
				`Target already exists: ${targetPath}\nRun sync instead or remove it first.`,
			);
		}

		await fs.copy(source, targetPath);

		// Write installed version marker so `sync` can detect staleness later
		const version =
			typeof __PKG_VERSION__ !== "undefined" ? __PKG_VERSION__ : "?";
		await fs.writeFile(path.join(targetPath, ".version"), version, "utf-8");
	}
}
