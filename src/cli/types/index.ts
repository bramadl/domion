export type GeneratorTypeOptions =
	| "value-object"
	| "entity"
	| "aggregate"
	| "repository"
	| "use-case";

export type NamingOptions = "kebab-case" | "snake_case" | "PascalCase";

export interface ResolveOutputOptions {
	type: GeneratorTypeOptions;
	target?: string;
	location?: string;
}

export interface ToolkitConfigOptions {
	drimion: {
		corePath: string;
		importAlias: string;
		naming: NamingOptions;
		targets: Record<string, Record<string, string>>;
	};
}
