import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import Handlebars from "handlebars";

import type { GeneratorTypeOptions, ToolkitConfigOptions } from "../types";

import { toFileName, toPascalCase } from "../utils/naming";
import { Resolver } from "./resolver";

export interface GenerateOptions {
	type: GeneratorTypeOptions;
	name: string;
	outputPath: string;
	config: ToolkitConfigOptions;
	cwd?: string;
}

/** biome-ignore lint/complexity/noStaticOnlyClass: No instantiation is needed */
export class Generator {
	static async generate(opts: GenerateOptions): Promise<void> {
		const className = toPascalCase(opts.name);

		const fileName = toFileName(
			className,
			opts.type,
			opts.config.drimion.naming,
		);

		const templatePath = Generator.resolveTemplatePath(opts.type);
		const templateContent = await Generator.loadTemplate(templatePath);

		const compiled = Generator.compileTemplate(templateContent);

		const output = compiled(
			Generator.buildTemplateContext({
				className,
				fileName,
				type: opts.type,
				config: opts.config,
			}),
		);

		const fullOutputPath = path.join(opts.outputPath, fileName);

		await Resolver.ensureDir(opts.outputPath);
		await Generator.writeFile(fullOutputPath, output);
	}

	private static resolveTemplatePath(type: string): string {
		const __dirname = path.dirname(fileURLToPath(import.meta.url));
		const templateFile = `${type}.ts.hbs`;

		// IMPORTANT:
		// After build → dist/cli/core/*
		// templates → dist/cli/templates/*
		return path.resolve(__dirname, "templates", templateFile);
	}

	private static async loadTemplate(filePath: string): Promise<string> {
		const exists = await fs.pathExists(filePath);

		if (!exists) {
			throw new Error(`Template not found: ${filePath}`);
		}

		return fs.readFile(filePath, "utf-8");
	}

	private static compileTemplate(template: string) {
		return Handlebars.compile(template, {
			noEscape: true,
		});
	}

	private static buildTemplateContext(opts: {
		className: string;
		fileName: string;
		type: GeneratorTypeOptions;
		config: ToolkitConfigOptions;
	}) {
		return {
			className: opts.className,
			fileName: opts.fileName,
			type: opts.type,
			importAlias: opts.config.drimion.importAlias,
			lowerName: opts.className.toLowerCase(),
		};
	}

	private static async writeFile(
		filePath: string,
		content: string,
	): Promise<void> {
		const exists = await fs.pathExists(filePath);

		if (exists) {
			throw new Error(`File already exists: ${filePath}`);
		}

		await fs.writeFile(filePath, content, "utf-8");
	}
}
