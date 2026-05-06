import path from "node:path";
import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs-extra";

import { Copier } from "../core/copier";
import { logger } from "../utils/logger";

type NamingOption = "kebab-case" | "snake_case" | "PascalCase";

interface InitAnswers {
	corePath: string;
	importAlias: string;
	naming: NamingOption;
}

const DEFAULTS: InitAnswers = {
	corePath: "src/lib/domion",
	importAlias: "domion",
	naming: "kebab-case",
};

function isCancelled(err: unknown): boolean {
	return (
		err instanceof Error && err.message.includes("force closed the prompt")
	);
}

async function askInitQuestions(): Promise<InitAnswers> {
	const corePath = await input({
		message: "Where should the library kernel be installed?",
		default: DEFAULTS.corePath,
	});

	const importAlias = await input({
		message: "Import alias for your project (configure in tsconfig paths):",
		default: DEFAULTS.importAlias,
	});

	const naming = await select<NamingOption>({
		message: "File naming convention for generated files:",
		choices: [
			{
				value: "kebab-case",
				name: "kebab-case  (email-address.value-object.ts)",
			},
			{
				value: "snake_case",
				name: "snake_case  (email_address.value_object.ts)",
			},
			{
				value: "PascalCase",
				name: "PascalCase  (EmailAddress.ValueObject.ts)",
			},
		],
	});

	return { corePath, importAlias, naming };
}

function buildConfigTemplate(answers: InitAnswers): string {
	return `export default {
  domion: {
    corePath: "${answers.corePath}",
    importAlias: "${answers.importAlias}",
    naming: "${answers.naming}",
    targets: {
      entity: {},
      valueObject: {},
      aggregate: {},
      repository: {},
      usecase: {},
    },
  },
};`;
}

function step(n: string) {
	return chalk.bgCyan.black(` ${n} `);
}

function nextSteps(answers: InitAnswers) {
	return [
		chalk.bold("All done! Here's what to do next:"),
		"",
		`${step("1")} Add the import alias to your ${chalk.cyan("tsconfig.json")}:`,
		"",
		chalk.dim('    "paths": {'),
		chalk.dim(`      "${answers.importAlias}": ["./${answers.corePath}"]`),
		chalk.dim("    }"),
		"",
		`${step("2")} Run your first generator:`,
		"",
		`    ${chalk.cyan("npx domion generate")}`,
		"",
		`${step("3")} List available generators:`,
		"",
		`    ${chalk.cyan("npx domion list")}`,
		"",
	];
}

export const initCommand = new Command("init")
	.description("Initialize domion in your project")
	.option("-y, --yes", "Skip prompts and use defaults")
	.action(async (options) => {
		logger.banner();

		try {
			const cwd = process.cwd();
			const skipPrompts: boolean = options.yes ?? false;

			// ── Resolve answers ───────────────────────────────────────
			let answers: InitAnswers;
			if (skipPrompts) {
				answers = DEFAULTS;
				logger.info("Using defaults (--yes).");
				console.log();
			} else {
				try {
					answers = await askInitQuestions();
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
			}

			const configPath = path.resolve(cwd, "domion.config.ts");
			const kernelPath = path.resolve(cwd, answers.corePath);

			const configExists = await fs.pathExists(configPath);
			const kernelExists = await fs.pathExists(kernelPath);

			// ── Already initialized ───────────────────────────────────
			if (configExists && kernelExists) {
				logger.warn("Already initialized.");
				console.log();
				logger.hint([
					chalk.bold("Files already in place:"),
					"",
					`  ${chalk.dim("kernel →")} ${answers.corePath}`,
					`  ${chalk.dim("config →")} domion.config.ts`,
					"",
					chalk.dim("Nothing was changed. To reinstall, remove them first."),
					"",
					...nextSteps(answers),
				]);
				process.exit(0);
			}

			// ── Kernel ────────────────────────────────────────────────
			if (kernelExists) {
				logger.warn("Kernel already exists — skipping copy.");
			} else {
				const spinner = logger.spinner("Installing library kernel...");
				await Copier.copyKernel(kernelPath);
				spinner.succeed(
					`Kernel installed  ${chalk.dim("→")} ${answers.corePath}`,
				);
			}

			// ── Config ────────────────────────────────────────────────
			if (configExists) {
				logger.warn("domion.config.ts already exists — skipping.");
			} else {
				await fs.writeFile(configPath, buildConfigTemplate(answers), "utf-8");
				logger.success(`Config created    ${chalk.dim("→")} domion.config.ts`);
			}

			// ── Next steps ────────────────────────────────────────────
			console.log();
			logger.divider();
			console.log();
			logger.hint(nextSteps(answers));
		} catch (err) {
			logger.error(err instanceof Error ? err.message : String(err));
			process.exit(1);
		}
	});
