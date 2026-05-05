import { beforeEach, describe, expect, test } from "bun:test";
import { ServerEventManager } from "../../../src/kernel/events/server-event-manager";

const createPayload = () => ({ foo: "bar" });

describe("[Core] ServerEventManager", () => {
  beforeEach(() => {
    ServerEventManager.__reset();
  });
  
  test("registers and detects event existence", () => {
    const manager = ServerEventManager.instance();
		manager.subscribe("test:event", () => {});

		expect(manager.exists("test:event")).toBe(true);
	});

	test("dispatches event to subscribers", () => {
    const manager = ServerEventManager.instance();
		let called = false;

		manager.subscribe("test:event", () => {
			called = true;
		});

		manager.dispatchEvent("test:event", createPayload());

		expect(called).toBe(true);
	});

	test("supports multiple subscribers", () => {
    const manager = ServerEventManager.instance();
		let count = 0;

		manager.subscribe("test:event", () => void count++);
		manager.subscribe("test:event", () => void count++);

		manager.dispatchEvent("test:event", createPayload());

		expect(count).toBe(2);
	});

	test("removes event and its subscribers", () => {
    const manager = ServerEventManager.instance();
		manager.subscribe("test:event", () => {});

		const removed = manager.removeEvent("test:event");

		expect(removed).toBe(true);
		expect(manager.exists("test:event")).toBe(false);
	});

	test("returns false when removing non-existing event", () => {
    const manager = ServerEventManager.instance();
		const removed = manager.removeEvent("unknown:event");

		expect(removed).toBe(false);
	});

	test("does nothing when dispatching unknown event", () => {
    const manager = ServerEventManager.instance();
		expect(() =>
			manager.dispatchEvent("unknown:event", createPayload()),
		).not.toThrow();
	});

	test("supports async subscribers", async () => {
    const manager = ServerEventManager.instance();
		let done = false;

		manager.subscribe("test:event", async () => {
			await new Promise((r) => setTimeout(r, 2));
			done = true;
		});

		manager.dispatchEvent("test:event", createPayload());

    await new Promise((r) => setTimeout(r, 5));
		expect(done).toBe(true);
	});
});
