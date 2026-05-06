import path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import type { Ora } from "ora";
import { Generator } from "../core/generator";
import { Resolver } from "../core/resolver";
import type { GeneratorTypeOptions } from "../types";
import { logger } from "../utils/logger";
import { toFileName, toPascalCase } from "../utils/naming";
import { prompts } from "../utils/prompts";
import { toConfigKey } from "../utils/type-map";

/**
 * Commander parses `-n=User` as the literal string `=User`.
 * Strip a leading `=` so both `-n=User` and `-n User` work.
 */
function stripLeadingEquals(value: string): string {
	return value.startsWith("=") ? value.slice(1) : value;
}

export const generateCommand = new Command("generate")
	.description("Generate a DDD building block from a template")
	.argument("[type]", "Generator type (entity, value-object, etc)")
	.option("-n, --name <name>", "Name of the class")
	.option("-t, --target <target>", "Target from config")
	.option("-l, --location <location>", "Manual output path")
	.action(async (typeArg, options) => {
		logger.banner();
		let spinner: Ora | undefined;

		// Non-interactive = type + name + (target | location) all supplied upfront.
		// banner() already prints a trailing \n which serves as the gap before the spinner.
		// In interactive mode, prompts render right after that \n (consuming it visually),
		// so we need one explicit console.log() after prompts finish to restore the gap.
		const isInteractive =
			!typeArg || !options.name || (!options.target && !options.location);

		try {
			const config = await Resolver.loadConfig();

			// ── 1. Type ───────────────────────────────────────────────
			const type = (typeArg ||
				(await prompts.selectGenerator())) as GeneratorTypeOptions;

			// ── 2. Name ───────────────────────────────────────────────
			const rawName: string = options.name
				? stripLeadingEquals(options.name)
				: await prompts.inputName();

			const normalized = toPascalCase(rawName);

			// ── 3. Output path ────────────────────────────────────────
			let outputPath: string;
			if (options.location) {
				outputPath = Resolver.resolveLocation(
					stripLeadingEquals(options.location),
				);
			} else if (options.target) {
				outputPath = Resolver.resolveTarget(
					type,
					stripLeadingEquals(options.target),
					config,
				);
			} else {
				const configKey = toConfigKey(type);
				const targets = config.drimion.targets?.[configKey] || {};
				const target = await prompts.selectTarget(targets);

				if (target) {
					outputPath = Resolver.resolveTarget(type, target, config);
				} else {
					const location = await prompts.inputLocation();
					outputPath = Resolver.resolveLocation(location);
				}
			}

			// ── 4. Generate ───────────────────────────────────────────
			if (isInteractive) console.log();
			spinner = logger.spinner("Generating...");
			await Generator.generate({
				type,
				name: normalized,
				outputPath,
				config,
			});

			spinner.stop();

			// Reconstruct filename to show in summary (mirrors Generator logic)
			const fileName = toFileName(normalized, type, config.drimion.naming);
			const fullPath = path.join(outputPath, fileName);
			// Make path relative to cwd for readability
			const relativePath = path.relative(process.cwd(), fullPath);

			// ── Success summary ───────────────────────────────────────
			logger.divider();
			console.log();

			logger.hint([
				`${chalk.green("✔")} ${chalk.bold(normalized)} generated successfully.`,
				"",
				`  ${chalk.dim("type")}    ${chalk.cyan(type)}`,
				`  ${chalk.dim("file")}    ${chalk.white(relativePath)}`,
			]);

			console.log();
		} catch (err) {
			spinner?.stop();

			if (
				err instanceof Error &&
				err.message.includes("force closed the prompt")
			) {
				console.log();
				logger.cancelled();
				console.log();
				process.exit(0);
			}

			logger.divider();
			console.log();

			if (
				err instanceof Error &&
				err.message.startsWith("File already exists:")
			) {
				const absolutePath = err.message.replace("File already exists: ", "");
				const relativePath = path.relative(process.cwd(), absolutePath);

				logger.hint([
					chalk.dim(
						"Already generated? Edit the file directly, or delete it to regenerate.",
					),
				]);
				logger.error(`File already exists: ${relativePath}`);
			} else {
				logger.error(err instanceof Error ? err.message : String(err));
			}

			console.log();
			process.exit(1);
		}
	});
