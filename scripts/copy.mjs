import fs from "fs-extra";
import path from "node:path";

const root = process.cwd();

async function run() {
	await fs.ensureDir(path.join(root, "dist/cli/templates"));
	await fs.copy(
		path.join(root, "src/cli/templates"),
		path.join(root, "dist/cli/templates"),
	);

	await fs.ensureDir(path.join(root, "dist/kernel"));
	await fs.copy(
		path.join(root, "src/kernel"),
		path.join(root, "dist/kernel"),
	);
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
