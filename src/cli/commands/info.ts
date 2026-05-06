import chalk from "chalk";
import { Command } from "commander";
import { logger } from "../utils/logger";
import { resolvePackageManager } from "../utils/package-manager";

const { __PKG_REPOSITORY__ } = resolvePackageManager();

interface CommandInfo {
	name: string;
	description: string;
	arguments?: string;
	flags?: { flag: string; description: string }[];
	examples: string[];
}

const COMMANDS: CommandInfo[] = [
	{
		name: "init",
		description: "Initialize drimion in your project.",
		flags: [
			{
				flag: "-y, --yes",
				description: "Skip all prompts and use defaults",
			},
		],
		examples: ["npx drimion init", "npx drimion init -y"],
	},
	{
		name: "generate",
		description:
			"Generate a DDD building block from a template. Runs interactively if flags are omitted.",
		arguments:
			"[type]  entity | value-object | aggregate | repository | use-case",
		flags: [
			{
				flag: "-n, --name <name>",
				description: "Class name (auto-normalized to PascalCase)",
			},
			{
				flag: "-t, --target <target>",
				description: "Predefined target path from drimion.config.ts",
			},
			{ flag: "-l, --location <path>", description: "Manual output directory" },
		],
		examples: [
			"npx drimion generate",
			"npx drimion generate entity -n User -t user",
			"npx drimion generate value-object -n Email -l src/modules/user/domain",
		],
	},
	{
		name: "list",
		description:
			"List all available generators and the targets configured in drimion.config.ts.",
		examples: ["npx drimion list"],
	},
	{
		name: "sync",
		description:
			"Update the library kernel to the latest version. Offers backup before overwriting.",
		flags: [
			{
				flag: "-f, --force",
				description: "Overwrite everything — no prompts, no backup",
			},
		],
		examples: ["npx drimion sync", "npx drimion sync -f"],
	},
	{
		name: "uninstall",
		description:
			"Remove the library kernel and drimion.config.ts from your project.",
		examples: ["npx drimion uninstall"],
	},
	{
		name: "info",
		description: "Display CLI information and command reference.",
		examples: ["npx drimion info"],
	},
];

function printCommand(cmd: CommandInfo, isLast: boolean): void {
	const connector = isLast ? "╰─" : "├─";
	const indent = isLast ? "   " : "│  ";

	// Command name + description
	console.log(`  ${chalk.dim(connector)} ${chalk.cyan.bold(cmd.name)}`);
	console.log(`  ${chalk.dim(indent)}  ${chalk.white(cmd.description)}`);

	// Arguments
	if (cmd.arguments) {
		console.log();
		console.log(`  ${chalk.dim(indent)}  ${chalk.dim("argument")}`);
		console.log(
			`  ${chalk.dim(indent)}  ${chalk.dim("─────────────────────────────────")}`,
		);
		console.log(`  ${chalk.dim(indent)}  ${chalk.white(cmd.arguments)}`);
	}

	// Flags
	if (cmd.flags && cmd.flags.length > 0) {
		console.log();
		console.log(`  ${chalk.dim(indent)}  ${chalk.dim("flags")}`);
		console.log(
			`  ${chalk.dim(indent)}  ${chalk.dim("─────────────────────────────────")}`,
		);
		for (const { flag, description } of cmd.flags) {
			const flagCol = chalk.yellow(flag.padEnd(26));
			console.log(
				`  ${chalk.dim(indent)}  ${flagCol}${chalk.dim(description)}`,
			);
		}
	}

	// Examples
	console.log();
	console.log(`  ${chalk.dim(indent)}  ${chalk.dim("examples")}`);
	console.log(
		`  ${chalk.dim(indent)}  ${chalk.dim("─────────────────────────────────")}`,
	);
	for (const example of cmd.examples) {
		console.log(
			`  ${chalk.dim(indent)}  ${chalk.dim("$")} ${chalk.white(example)}`,
		);
	}

	// Trailing spacer (skip after last)
	if (!isLast) console.log(`  ${chalk.dim("│")}`);
}

export const infoCommand = new Command("info")
	.description("Display CLI information and command reference")
	.action(() => {
		logger.banner(true);

		if (__PKG_REPOSITORY__) {
			logger.hint([chalk.bold("Docs & Source")]);
			logger.hint([
				`GitHub Repo  ${chalk.dim("→")}  ${chalk.cyan(
					__PKG_REPOSITORY__.replace(/^git\+/, "").replace(/\.git$/, ""),
				)}`,
			]);

			console.log();
			logger.divider();
			console.log();
		}

		logger.hint([chalk.bold("Command Reference")]);
		console.log();
		logger.divider();
		console.log();

		console.log(`  ${chalk.dim("│")}`);
		COMMANDS.forEach(
			(cmd, i) => void printCommand(cmd, i === COMMANDS.length - 1),
		);

		console.log();
	});
