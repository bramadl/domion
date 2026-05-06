import type { GeneratorTypeOptions, NamingOptions } from "../types";

function tokenize(input: string): string[] {
	return (
		input
			.trim()
			// split camelCase / PascalCase → words
			.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
			// replace separators with space
			.replace(/[_-]+/g, " ")
			// remove non-alphanumeric (except space)
			.replace(/[^\w\s]/g, "")
			.toLowerCase()
			.split(/\s+/)
			.filter(Boolean)
	);
}

export function toPascalCase(input: string): string {
	const tokens = tokenize(input);
	if (tokens.length === 0) {
		throw new Error("Invalid name: cannot normalize empty input");
	}

	return tokens
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("");
}

function toKebabCase(tokens: string[]): string {
	return tokens.join("-");
}

function toSnakeCase(tokens: string[]): string {
	return tokens.join("_");
}

function toPascalFile(tokens: string[]): string {
	return tokens.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

/**
 * @description
 * Generate filename based on naming convention + generator output type
 *
 * @param className The input value used for the filename.
 * @param type The output generation type. Suffixes the filename.
 * @param convention The naming convention for the generated filename.
 * @returns A string representing the filename.
 *
 * @example
 * ```typescript
 * toFileName("User", "entity", "kebab-case") // user.entity.ts
 * toFileName("UserProfile", "value-object", "snake_case") // user_profile.value_object.ts
 * toFileName("Order", "aggregate", "PascalCase") // Order.Aggregate.ts
 * ```
 */
export function toFileName(
	className: string,
	type: GeneratorTypeOptions,
	convention: NamingOptions,
): string {
	if (!className) throw new Error("className is required");
	if (!type) throw new Error("type is required");

	let base: string;
	let suffix: string;

	switch (convention) {
		case "kebab-case":
			base = toKebabCase(tokenize(className));
			suffix = toKebabCase(tokenize(type));
			break;

		case "snake_case":
			base = toSnakeCase(tokenize(className));
			suffix = toSnakeCase(tokenize(type));
			break;

		case "PascalCase":
			base = toPascalFile(tokenize(className));
			suffix = toPascalFile(tokenize(type));
			break;

		default:
			throw new Error(`Unsupported naming convention: ${convention}`);
	}

	return `${base}.${suffix}.ts`;
}
