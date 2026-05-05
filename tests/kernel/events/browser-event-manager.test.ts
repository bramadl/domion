import { beforeEach, describe, expect, test } from "bun:test";
import { BrowserEventManager, type WindowLike } from "../../../src/kernel/events/browser-event-manager";

const createMockWindow = () => {
	const listeners: Record<string, Function[]> = {};
	const storage: Record<string, string> = {};

	return {
		addEventListener: (type: string, fn: EventListener) => {
			listeners[type] ??= [];
			listeners[type].push(fn);
		},
		removeEventListener: (type: string, fn: EventListener) => {
			listeners[type] = (listeners[type] || []).filter((f) => f !== fn);
		},
		dispatchEvent: (event: Event) => {
			const fns = listeners[event.type] || [];
			for (const fn of fns) fn(event);
			return true;
		},
		sessionStorage: {
			getItem: (key: string) => storage[key] ?? null,
			setItem: (key: string, value: string) => {
				storage[key] = value;
			},
			removeItem: (key: string) => {
				delete storage[key];
			},
		},
		CustomEvent: class<T> {
			type: string;
			detail: T;

			constructor(type: string, init?: { detail?: T }) {
				this.type = type;
				this.detail = init?.detail as T;
			}
		} as any,
	} as WindowLike;
};

describe("[Core] BrowserEventManager", () => {
  beforeEach(() => {
    BrowserEventManager.__reset();
  });
  
  test("registers and dispatches events", () => {
    const mockWindow = createMockWindow();
    const manager = BrowserEventManager.instance(mockWindow);
    
		let called = false;

		manager.subscribe("test:event", () => {
			called = true;
		});

		manager.dispatchEvent("test:event", { foo: "bar" });

		expect(called).toBe(true);
	});

	test("supports multiple subscribers", () => {
    const mockWindow = createMockWindow();
    const manager = BrowserEventManager.instance(mockWindow);

		let count = 0;

		manager.subscribe("test:event", () => void count++);
		manager.subscribe("test:event", () => void count++);

		manager.dispatchEvent("test:event", {});

		expect(count).toBe(2);
	});

	test("exists returns correct value", () => {
    const mockWindow = createMockWindow();
    const manager = BrowserEventManager.instance(mockWindow);

		manager.subscribe("test:event", () => {});

		expect(manager.exists("test:event")).toBe(true);
		expect(manager.exists("unknown:event")).toBe(false);
	});

	test("removeEvent unregisters listeners", () => {
    const mockWindow = createMockWindow();
    const manager = BrowserEventManager.instance(mockWindow);

		manager.subscribe("test:event", () => {});

		const removed = manager.removeEvent("test:event");

		expect(removed).toBe(true);
		expect(manager.exists("test:event")).toBe(false);
	});

	test("dispatch does nothing for unknown event", () => {
    const mockWindow = createMockWindow();
    const manager = BrowserEventManager.instance(mockWindow);

		expect(() =>
			manager.dispatchEvent("unknown:event", {}),
		).not.toThrow();
	});
});
