import { describe, expect, test } from "bun:test";
import { BrowserEventManager } from "../../../src/kernel/events/browser-event-manager";
import { EventContext } from "../../../src/kernel/events/event-context";
import { ServerEventManager } from "../../../src/kernel/events/server-event-manager";

describe("[Core] EventContext", () => {
	test("resolves ServerEventManager in Node environment", () => {
		EventContext.__reset();

		const manager = EventContext.resolve();

		expect(manager).toBeInstanceOf(ServerEventManager);
	});

	test("resolves BrowserEventManager in browser environment", () => {
		EventContext.__reset();

		const originalProcess = global.process;
		const originalWindow = globalThis.window;

		Object.defineProperty(global, "process", {
			value: undefined,
			configurable: true,
		});

		// @ts-ignore
		globalThis.window = {} as Window;

		const manager = EventContext.resolve();

		expect(manager).toBeInstanceOf(BrowserEventManager);

		// restore
		Object.defineProperty(global, "process", {
			value: originalProcess,
			configurable: true,
		});
		globalThis.window = originalWindow;
	});

	test("returns same instance (singleton)", () => {
		EventContext.__reset();

		const a = EventContext.resolve();
		const b = EventContext.resolve();

		expect(a).toBe(b);
	});

	test("throws when environment cannot be determined", () => {
		EventContext.__reset();

		const originalProcess = global.process;
		const originalWindow = globalThis.window;

		Object.defineProperty(global, "process", {
			value: undefined,
			configurable: true,
		});

		// @ts-ignore
		delete globalThis.window;

		expect(() => EventContext.resolve()).toThrow();

		// restore
		Object.defineProperty(global, "process", {
			value: originalProcess,
			configurable: true,
		});
		globalThis.window = originalWindow;
	});
});
