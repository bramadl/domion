import { Command } from "commander";
import { generateCommand } from "./commands/generate";
import { infoCommand } from "./commands/info";
import { initCommand } from "./commands/init";
import { listCommand } from "./commands/list";
import { syncCommand } from "./commands/sync";
import { uninstallCommand } from "./commands/uninstall";
import { resolvePackageManager } from "./utils/package-manager";

const program = new Command();
const { __PKG_NAME__, __PKG_VERSION__ } = resolvePackageManager();

program
	.name(__PKG_NAME__)
	.description("Headless DDD Toolkit CLI")
	.version(__PKG_VERSION__);

program.addCommand(infoCommand);
program.addCommand(initCommand);
program.addCommand(listCommand);
program.addCommand(generateCommand);
program.addCommand(syncCommand);
program.addCommand(uninstallCommand);

program.parse();
