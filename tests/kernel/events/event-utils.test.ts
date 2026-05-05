import { describe, test, expect } from "bun:test";
import { ValidateEventName } from "../../../src/kernel/events/event-utils";

describe("[Core] ValidateEventName", () => {
	test("accepts valid event names", () => {
		expect(() => ValidateEventName("order:placed")).not.toThrow();
		expect(() => ValidateEventName("user:registered")).not.toThrow();
		expect(() => ValidateEventName("payment:completed")).not.toThrow();
	});

	test("throws for missing colon", () => {
		expect(() => ValidateEventName("orderplaced")).toThrow();
	});

	test("throws for empty string", () => {
		expect(() => ValidateEventName("")).toThrow();
	});

	test("throws for missing context", () => {
		expect(() => ValidateEventName(":placed")).toThrow();
	});

	test("throws for missing event name", () => {
		expect(() => ValidateEventName("order:")).toThrow();
	});

	test("throws for multiple colons", () => {
		expect(() => ValidateEventName("order:placed:extra")).toThrow();
	});

	test("throws for invalid characters", () => {
		expect(() => ValidateEventName("order placed")).toThrow();
		expect(() => ValidateEventName("order@placed")).toThrow();
		expect(() => ValidateEventName("order#placed")).toThrow();
	});

	test("throws for non-string input", () => {
		expect(() => ValidateEventName(null as any)).toThrow();
		expect(() => ValidateEventName(undefined as any)).toThrow();
		expect(() => ValidateEventName(123 as any)).toThrow();
		expect(() => ValidateEventName({} as any)).toThrow();
	});
});