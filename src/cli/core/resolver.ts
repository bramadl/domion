import path from "node:path";
import { pathToFileURL } from "node:url";
import fs from "fs-extra";

import type {
	GeneratorTypeOptions,
	ResolveOutputOptions,
	ToolkitConfigOptions,
} from "../types";
import { toConfigKey } from "../utils/type-map";

/** biome-ignore lint/complexity/noStaticOnlyClass: No instantiation is needed */
export class Resolver {
	static async loadConfig(cwd = process.cwd()): Promise<ToolkitConfigOptions> {
		const configPath = path.resolve(cwd, "domion.config.ts");

		const exists = await fs.pathExists(configPath);
		if (!exists) {
			throw new Error(
				"Config file `domion.config.ts` not found. Run `npx domion init` first.",
			);
		}

		try {
			const module = await import(pathToFileURL(configPath).href);

			const config: ToolkitConfigOptions = module.default;

			if (!config?.domion) {
				throw new Error("Invalid config: missing `domion` key");
			}

			if (!config.domion.targets) {
				throw new Error("Invalid config: missing `domion.targets`");
			}

			return config;
		} catch (err) {
			throw new Error(
				`Failed to load domion.config.ts: ${
					err instanceof Error ? err.message : String(err)
				}`,
			);
		}
	}

	static resolveTarget(
		type: GeneratorTypeOptions,
		target: string,
		config: ToolkitConfigOptions,
		cwd = process.cwd(),
	): string {
		const key = toConfigKey(type);

		const typeTargets = config.domion.targets?.[key];
		if (!typeTargets) {
			throw new Error(`No targets defined for type "${type}"`);
		}

		const targetPath = typeTargets[target];
		if (!targetPath) {
			throw new Error(
				`Target "${target}" not found for type "${type}" in config`,
			);
		}

		return path.resolve(cwd, targetPath);
	}

	static resolveLocation(location: string, cwd = process.cwd()): string {
		if (!location || location.trim() === "") {
			throw new Error("Invalid location: cannot be empty");
		}

		return path.resolve(cwd, location);
	}

	static resolveOutputPath(
		opts: ResolveOutputOptions,
		config: ToolkitConfigOptions,
		cwd = process.cwd(),
	): string {
		const { type, target, location } = opts;

		if (!type) {
			throw new Error("Generator type is required");
		}

		if (location) {
			return Resolver.resolveLocation(location, cwd);
		}

		if (target) {
			return Resolver.resolveTarget(
				type as GeneratorTypeOptions,
				target,
				config,
				cwd,
			);
		}

		throw new Error("Either `target` or `location` must be provided");
	}

	static async ensureDir(dir: string): Promise<void> {
		await fs.ensureDir(dir);
	}

	static resolveCorePath(
		config: ToolkitConfigOptions,
		cwd = process.cwd(),
	): string {
		if (!config.domion.corePath) {
			throw new Error("Invalid config: missing `domion.corePath`");
		}

		return path.resolve(cwd, config.domion.corePath);
	}
}
