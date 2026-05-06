import path from "node:path";
import { confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs-extra";

import { Resolver } from "../core/resolver";
import { logger } from "../utils/logger";

function isCancelled(err: unknown): boolean {
	return (
		err instanceof Error && err.message.includes("force closed the prompt")
	);
}

export const uninstallCommand = new Command("uninstall")
	.description("Remove drimion kernel and config from your project")
	.action(async () => {
		logger.banner();

		const cwd = process.cwd();
		const configPath = path.resolve(cwd, "drimion.config.ts");

		// ── Resolve what exists ───────────────────────────────────────
		const configExists = await fs.pathExists(configPath);

		let kernelPath: string;
		try {
			const config = await Resolver.loadConfig(cwd);
			kernelPath = path.resolve(cwd, config.drimion.corePath);
		} catch {
			kernelPath = path.resolve(cwd, "src/lib/drimion");
		}

		const kernelExists = await fs.pathExists(kernelPath);

		// ── Nothing to remove ─────────────────────────────────────────
		if (!configExists && !kernelExists) {
			logger.warn("Nothing to uninstall — no config or kernel found.");
			console.log();
			process.exit(0);
		}

		// ── Show what will be removed ─────────────────────────────────
		logger.hint([
			chalk.bold("The following will be permanently deleted:"),
			"",
			...(kernelExists
				? [`  ${chalk.red("✖")} ${path.relative(cwd, kernelPath)}`]
				: []),
			...(configExists ? [`  ${chalk.red("✖")} drimion.config.ts`] : []),
		]);

		// ── Confirm ───────────────────────────────────────────────────
		let confirmed: boolean;
		try {
			console.log();
			confirmed = await confirm({
				message: "Are you sure? This cannot be undone.",
				default: false,
			});
			console.log();
		} catch (err) {
			if (isCancelled(err)) {
				console.log();
				logger.cancelled();
				console.log();
				process.exit(0);
			}
			throw err;
		}

		if (!confirmed) {
			console.log();
			logger.cancelled();
			console.log();
			process.exit(0);
		}

		// ── Remove ────────────────────────────────────────────────────
		if (kernelExists) {
			await fs.remove(kernelPath);
			logger.success(
				`Removed  ${chalk.dim("→")} ${path.relative(cwd, kernelPath)}`,
			);
		}

		if (configExists) {
			await fs.remove(configPath);
			logger.success(`Removed  ${chalk.dim("→")} drimion.config.ts`);
		}

		console.log();
		logger.divider();
		console.log();
		logger.hint([chalk.dim("Uninstall complete. Run init to start fresh.")]);
		console.log();
	});
