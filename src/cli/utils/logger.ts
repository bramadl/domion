import chalk from "chalk";
import ora, { type Ora } from "ora";
import { resolvePackageManager } from "./package-manager";

const { __PKG_NAME__, __PKG_VERSION__, __PKG_REPOSITORY__ } =
	resolvePackageManager();

export const logger = {
	banner(info = false) {
		const title = `  @${__PKG_NAME__}/cli  •  v${__PKG_VERSION__}  `;
		const border = "─".repeat(title.length);

		console.log();
		console.log(chalk.dim(`  ╭${border}╮`));
		console.log(chalk.bold.cyan(`  │${title}│`));
		console.log(chalk.dim(`  ╰${border}╯`));
		if (info) {
			console.log();
			console.log(
				chalk.cyan.bold(
					`  ${__PKG_NAME__} - Headless DDD primitives CLI for TypeScript`,
				),
			);
		}
		console.log();
	},

	info(message: string) {
		console.log(chalk.cyan(`  ${message}`));
	},

	success(message: string) {
		console.log(chalk.green(`  ✔ ${message}`));
	},

	warn(message: string) {
		console.log(chalk.yellow(`  ⚠ ${message}`));
	},

	error(message: string) {
		console.error(chalk.red(`  ✖ ${message}`));
	},

	/**
	 * Print an indented block of lines — used for "next steps", summaries, etc.
	 * Each line is already pre-formatted by the caller (can include chalk).
	 */
	hint(lines: string[]) {
		for (const line of lines) {
			console.log(`  ${line}`);
		}
	},

	divider() {
		console.log(chalk.dim(`  ${"─".repeat(42)}`));
	},

	cancelled() {
		console.log(chalk.yellow("  ○ Cancelled."));
	},

	spinner(message: string): Ora {
		return ora({
			text: message,
			spinner: "dots",
			indent: 2,
		}).start();
	},
};
