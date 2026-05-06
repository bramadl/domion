import type { GeneratorTypeOptions } from "../types";

const TYPE_MAP: Record<GeneratorTypeOptions, string> = {
	entity: "entity",
	"value-object": "valueObject",
	aggregate: "aggregate",
	repository: "repository",
	"use-case": "usecase",
};

export function toConfigKey(type: GeneratorTypeOptions): string {
	return TYPE_MAP[type];
}
