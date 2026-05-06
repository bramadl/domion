import path from "node:path";
import { fileURLToPath } from "node:url";
import { select } from "@inquirer/prompts";
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs-extra";
import { Copier } from "../core/copier";
import { Resolver } from "../core/resolver";
import { logger } from "../utils/logger";
import { resolvePackageManager } from "../utils/package-manager";

const { __PKG_VERSION__ } = resolvePackageManager();

function isCancelled(err: unknown): boolean {
	return (
		err instanceof Error && err.message.includes("force closed the prompt")
	);
}

function resolveKernelSource(): string {
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	return path.resolve(__dirname, "..", "..", "kernel");
}

/** Read the version written by `Copier.copyKernel()` into the installed kernel */
async function readInstalledVersion(
	kernelPath: string,
): Promise<string | null> {
	const versionFile = path.join(kernelPath, ".version");
	try {
		const raw = await fs.readFile(versionFile, "utf-8");
		return raw.trim() || null;
	} catch {
		return null;
	}
}

/** Version of this CLI binary — injected by tsup at build time */
function getPackageVersion(): string {
	return typeof __PKG_VERSION__ !== "undefined" ? __PKG_VERSION__ : "?";
}

export const syncCommand = new Command("sync")
	.description("Update the library kernel to the latest version")
	.option("-f, --force", "Overwrite everything — no prompts, no backup")
	.action(async (options) => {
		logger.banner();

		const cwd = process.cwd();
		const force: boolean = options.force ?? false;

		try {
			// ── Resolve paths ─────────────────────────────────────────
			const config = await Resolver.loadConfig(cwd);
			const kernelPath = Resolver.resolveCorePath(config, cwd);
			const kernelSource = resolveKernelSource();

			// ── Validate source ───────────────────────────────────────
			const sourceExists = await fs.pathExists(kernelSource);
			if (!sourceExists) {
				logger.error(
					`Kernel source not found at: ${kernelSource}\nMake sure the package is up to date.`,
				);
				console.log();
				process.exit(1);
			}

			// ── Validate kernel is installed ──────────────────────────
			const kernelExists = await fs.pathExists(kernelPath);
			if (!kernelExists) {
				logger.warn("Kernel not found — nothing to sync.");
				console.log();
				logger.hint([
					chalk.dim(`Expected at: ${path.relative(cwd, kernelPath)}`),
					chalk.dim("Run `npx drimion init` to install first."),
				]);
				console.log();
				process.exit(0);
			}

			// ── Version check ─────────────────────────────────────────
			const installedVersion = await readInstalledVersion(kernelPath);
			const availableVersion = getPackageVersion();

			const relativeKernelPath = path.relative(cwd, kernelPath);

			if (installedVersion && installedVersion === availableVersion && !force) {
				logger.hint([
					`${chalk.green("✔")} Kernel is already up to date.`,
					"",
					`  ${chalk.dim("version")}    ${chalk.cyan(installedVersion)}`,
					`  ${chalk.dim("path")}       ${chalk.white(relativeKernelPath)}`,
				]);
				console.log();
				process.exit(0);
			}

			// ── Show what's changing ──────────────────────────────────
			if (installedVersion || availableVersion) {
				logger.hint([
					chalk.bold("A new version of the library kernel is available."),
					"",
					`  ${chalk.dim("installed")}   ${chalk.yellow(installedVersion ?? "unknown")}`,
					`  ${chalk.dim("available")}   ${chalk.cyan(availableVersion)}`,
				]);
				console.log();
			}

			// ── Force mode — overwrite directly ───────────────────────
			if (force) {
				const spinner = logger.spinner("Syncing kernel...");
				await fs.remove(kernelPath);
				await fs.copy(kernelSource, kernelPath);
				spinner.succeed(
					`Kernel updated  ${chalk.dim("→")} ${relativeKernelPath}`,
				);
				console.log();
				process.exit(0);
			}

			// ── Interactive prompt ────────────────────────────────────
			let choice: "overwrite" | "skip" | "backup";
			try {
				choice = await select({
					message: "What do you want to do?",
					choices: [
						{ value: "overwrite" as const, name: "Overwrite existing files" },
						{ value: "skip" as const, name: "Skip update" },
						{
							value: "backup" as const,
							name: "Backup current version and install new",
						},
					],
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

			// ── Skip ──────────────────────────────────────────────────
			if (choice === "skip") {
				logger.cancelled();
				console.log();
				process.exit(0);
			}

			// ── Backup + install ──────────────────────────────────────
			if (choice === "backup") {
				const backupVersion = installedVersion ?? "unknown";
				const backupPath = path.join(
					kernelPath,
					"__backup__",
					`v${backupVersion}`,
				);
				const tempBackupPath = path.join(cwd, `.drimion-backup-${Date.now()}`);
				const relativeBackupPath = path.relative(cwd, backupPath);

				// 1. Copy current kernel to a temp location outside kernelPath
				const spinner = logger.spinner("Backing up current kernel...");
				await fs.copy(kernelPath, tempBackupPath);
				spinner.succeed(
					`Backup saved    ${chalk.dim("→")} ${relativeBackupPath}`,
				);

				// 2. Remove old kernel, reinstall fresh (writes .version)
				const spinner2 = logger.spinner("Installing new kernel...");
				await fs.remove(kernelPath);
				await Copier.copyKernel(kernelPath);

				// 3. Move temp backup into the new kernel dir
				await fs.move(tempBackupPath, backupPath);
				spinner2.succeed(
					`Kernel updated  ${chalk.dim("→")} ${relativeKernelPath}`,
				);

				console.log();
				logger.divider();
				console.log();
				logger.hint([
					chalk.bold("Sync complete."),
					"",
					`  ${chalk.dim("backup")}   ${chalk.white(relativeBackupPath)}`,
					"",
					chalk.dim("Remember to add the backup directory to .gitignore:"),
					"",
					`  ${chalk.dim(`${relativeKernelPath}/__backup__/`)}`,
				]);
				console.log();
				process.exit(0);
			}

			// ── Overwrite ─────────────────────────────────────────────
			const spinner = logger.spinner("Syncing kernel...");
			await fs.remove(kernelPath);
			await Copier.copyKernel(kernelPath);
			spinner.succeed(
				`Kernel updated  ${chalk.dim("→")} ${relativeKernelPath}`,
			);

			console.log();
			logger.divider();
			console.log();
			logger.hint([chalk.bold("Sync complete.")]);
			console.log();
		} catch (err) {
			logger.error(err instanceof Error ? err.message : String(err));
			console.log();
			process.exit(1);
		}
	});
