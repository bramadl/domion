import { input, select } from "@inquirer/prompts";

export const prompts = {
	async selectGenerator(): Promise<string> {
		return select({
			message: "What do you want to generate?",
			choices: [
				{ value: "entity" },
				{ value: "value-object" },
				{ value: "aggregate" },
				{ value: "repository" },
				{ value: "use-case" },
			],
		});
	},

	async inputName(): Promise<string> {
		return input({
			message: "Name:",
			validate(value: string) {
				if (!value || value.trim() === "") return "Name is required";
				return true;
			},
		});
	},

	async selectTarget(targets: Record<string, string>): Promise<string | null> {
		const keys = Object.keys(targets || {});
		if (keys.length === 0) return null;

		const result = await select({
			message: "Where should this be created?",
			choices: [...keys, "manual"].map((k) => ({ value: k })),
		});

		return result === "manual" ? null : result;
	},

	async inputLocation(): Promise<string> {
		return input({
			message: "Enter output path:",
			validate(value: string) {
				if (!value || value.trim() === "") return "Location is required";
				return true;
			},
		});
	},
};
