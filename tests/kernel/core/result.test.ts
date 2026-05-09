import { describe, expect, test } from "bun:test";

import { Result, type ICommand } from "../../../src/kernel";

describe("[Lib] Result", () => {
	describe("Static Factories", () => {
		describe("Result.success()", () => {
			test("creates a success result with no data and no metadata", () => {
				const result = Result.success();

				expect(result.isSuccess()).toBe(true);
				expect(result.isError()).toBe(false);
				expect(result.isNull()).toBe(true);
				expect(result.value()).toBeNull();
				expect(result.error()).toBeNull();
				expect(result.metaData()).toBeEmptyObject();
			});

			test("creates a success result carrying primitive data", () => {
				const result = Result.success("Pikachu");

				expect(result.isSuccess()).toBe(true);
				expect(result.isNull()).toBe(false);
				expect(result.value()).toBe("Pikachu");
				expect(result.error()).toBeNull();
			});

			test("creates a success result carrying non-primitive data", () => {
				const pokemon = { id: "pokemon-1", name: "Pikachu" };
				const result = Result.success(pokemon);

				expect(result.isSuccess()).toBe(true);
				expect(result.isNull()).toBe(false);
				expect(result.value()).toBe(pokemon);
				expect(result.error()).toBeNull();
			});

			test("creates a success result with both data and metadata", () => {
				const pokemon = { id: "pokemon-1", name: "Pikachu" };
				const metadata = { source: "PokePulse" };
				const result = Result.success(pokemon, metadata);

				expect(result.isSuccess()).toBe(true);
				expect(result.value()).toBe(pokemon);
				expect(result.metaData()).toBe(metadata);
			});
		});

		describe("Result.error()", () => {
			test("creates a failure result with no error message and no metadata", () => {
				const result = Result.error();

				expect(result.isSuccess()).toBe(false);
				expect(result.isError()).toBe(true);
				expect(result.isNull()).toBe(true);
				expect(result.value()).toBeNull();
				expect(result.error()).toBeString();
				expect(result.metaData()).toBeEmptyObject();
			});

			test("creates a failure result carrying an error message", () => {
				const result = Result.error("Something went wrong");

				expect(result.isError()).toBe(true);
				expect(result.error()).toBe("Something went wrong");
				expect(result.value()).toBeNull();
			});

			test("creates a failure result with both an error message and metadata", () => {
				const metadata = { status: 500 };
				const result = Result.error("Something went wrong", metadata);

				expect(result.isError()).toBe(true);
				expect(result.error()).toBe("Something went wrong");
				expect(result.metaData()).toBe(metadata);
			});
		});
	});

	describe("Static Combinators", () => {
		describe("Result.combine()", () => {
			test("returns a success result when all results are successful", () => {
				const combined = Result.combine([
					Result.success("first"),
					Result.success("second"),
				]);

				expect(combined.isSuccess()).toBe(true);
			});

			test("returns the first failure result when at least one result is an error", () => {
				const combined = Result.combine([
					Result.success("first"),
					Result.error("invalid"),
					Result.success("third"),
				]);

				expect(combined.isError()).toBe(true);
				expect(combined.error()).toBe("invalid");
			});

			test("returns an error when an empty array is provided", () => {
				const combined = Result.combine([]);

				expect(combined.isError()).toBe(true);
			});
		});

		describe("Result.iterate()", () => {
			test("creates an iterator that traverses results in order", () => {
				const iterator = Result.iterate([
					Result.success("first"),
					Result.success("second"),
				]);

				expect(iterator.next().value()).toBe("first");
				expect(iterator.next().value()).toBe("second");
				expect(iterator.next()).toBeNull();
			});

			test("creates an empty iterator when called with no argument", () => {
				const iterator = Result.iterate();

				expect(iterator.isEmpty()).toBe(true);
				expect(iterator.next()).toBeNull();
			});

			test("creates an empty iterator when called with an empty array", () => {
				const iterator = Result.iterate([]);

				expect(iterator.isEmpty()).toBe(true);
			});
		});
	});

	describe("Instance Methods", () => {
		describe("result.toObject()", () => {
			test("serializes a success result into the expected plain object shape", () => {
				const obj = Result.success("ok", { requestId: "abc" }).toObject();

				expect(obj).toEqual({
					isSuccess: true,
					isError: false,
					data: "ok",
					error: null,
					metaData: { requestId: "abc" },
				});
			});

			test("serializes a failure result into the expected plain object shape", () => {
				const obj = Result.error("oops", { code: 404 }).toObject();

				expect(obj).toEqual({
					isSuccess: false,
					isError: true,
					data: null,
					error: "oops",
					metaData: { code: 404 },
				});
			});
		});

		describe("result.execute()", () => {
			const successCommand: ICommand<void, number> = {
				execute: async () => Result.success(42),
			};

			const errorCommand: ICommand<void, number> = {
				execute: async () => Result.error("command failed"),
			};

			test("invokes the command when result is success and .on('success') is called", async () => {
				const result = Result.success();
				const executed = await result.execute(successCommand).on("success");

				expect(executed?.isSuccess()).toBe(true);
				expect(executed?.value()).toBe(42);
			});

			test("skips the command when result is success and .on('error') is called", async () => {
				const result = Result.success();
				const executed = await result.execute(successCommand).on("error");

				expect(executed).toBeUndefined();
			});

			test("invokes the command when result is error and .on('error') is called", async () => {
				const result = Result.error("something failed");
				const executed = await result.execute(errorCommand).on("error");

				expect(executed?.isError()).toBe(true);
			});

			test("skips the command when result is error and .on('success') is called", async () => {
				const result = Result.error("something failed");
				const executed = await result.execute(successCommand).on("success");

				expect(executed).toBeUndefined();
			});

			test("passes data to the command via .withData().on('success')", async () => {
				const commandWithData: ICommand<{ value: number }, number> = {
					execute: async (input) => Result.success(input.value * 2),
				};

				const result = Result.success();
				const executed = await result
					.execute(commandWithData)
					.withData({ value: 10 })
					.on("success");

				expect(executed?.value()).toBe(20);
			});

			test("skips withData command when result is error and .on('success') is called", async () => {
				const commandWithData: ICommand<{ value: number }, number> = {
					execute: async (input) => Result.success(input.value * 2),
				};

				const result = Result.error("fail");
				const executed = await result
					.execute(commandWithData)
					.withData({ value: 10 })
					.on("success");

				expect(executed).toBeUndefined();
			});

			test("invokes withData command when result is error and .on('error') is called", async () => {
				const commandWithData: ICommand<{ message: string }, string> = {
					execute: async (input) => Result.success(input.message),
				};

				const result = Result.error("fail");
				const executed = await result
					.execute(commandWithData)
					.withData({ message: "recovered" })
					.on("error");

				expect(executed?.value()).toBe("recovered");
			});
		});
	});
});
