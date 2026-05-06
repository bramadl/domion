import chalk from "chalk";
import { Command } from "commander";

import { Resolver } from "../core/resolver";
import type { GeneratorTypeOptions } from "../types";
import { logger } from "../utils/logger";
import { toConfigKey } from "../utils/type-map";

const GENERATORS: GeneratorTypeOptions[] = [
	"entity",
	"value-object",
	"aggregate",
	"repository",
	"use-case",
];

// Pad a plain string (no chalk) to fixed width
const COL = 20;
function lpad(s: string) {
	return s.padEnd(COL);
}

export const listCommand = new Command("list")
	.description("List available generators and configured targets")
	.action(async () => {
		logger.banner();

		try {
			const config = await Resolver.loadConfig();

			// Header
			console.log(`  ${chalk.bold(lpad("Generator")) + chalk.bold("Targets")}`);
			console.log();
			logger.divider();
			console.log();

			for (const type of GENERATORS) {
				const configKey = toConfigKey(type);
				const targets = config.domion.targets?.[configKey] || {};
				const entries = Object.entries(targets);

				if (entries.length === 0) {
					// Plain string for left col so padEnd works correctly
					console.log(
						"  " +
							chalk.cyan(lpad(`• ${type}`)) +
							chalk.dim("(no targets configured)"),
					);
					continue;
				}

				entries.forEach(([name, targetPath], i) => {
					const leftStyled =
						i === 0
							? chalk.cyan(`• ${type}`) +
								" ".repeat(Math.max(0, COL - `• ${type}`.length))
							: " ".repeat(COL);

					const idx = chalk.dim(`(${i + 1})`);
					const targetName = chalk.white(name);
					const tPath = chalk.dim(targetPath);

					console.log(`  ${leftStyled}${idx} ${targetName}: ${tPath}`);
				});
			}

			console.log();
			logger.divider();
			console.log();
			logger.hint([
				`Run ${chalk.cyan("npx domion generate")} to create a new file.`,
			]);
			console.log();
		} catch (err) {
			logger.error(err instanceof Error ? err.message : String(err));
			console.log();
			process.exit(1);
		}
	});
