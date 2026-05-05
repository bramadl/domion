import { BrowserEventManager } from "./browser-event-manager";
import type { BaseEventManager } from "./event-manager";
import { ServerEventManager } from "./server-event-manager";

/**
 * @description
 * Internal cache for the resolved event manager instance.
 */
let managerCache: BaseEventManager | null = null;

/**
 * @description
 * Provides a platform-aware mechanism for resolving the appropriate built-in
 * event manager at runtime.
 *
 * `EventContext` detects whether the current environment is Node.js or a browser,
 * then initialises and returns the corresponding singleton `BaseEventManager`:
 * - Node.js / Bun / Deno → `ServerEventManager`
 * - Browser              → `BrowserEventManager`
 *
 * Detection uses `process.versions?.node` rather than just `process` to avoid
 * false positives in bundled browser environments (Webpack/Vite) where `process`
 * may be polyfilled.
 *
 * @remarks
 * `EventContext` is an **optional, convenience utility** for the built-in event
 * managers. Application code that uses `EventBus` or a custom `IEventBus`
 * implementation does not need this at all — it exists only to simplify access
 * to `BrowserEventManager` / `ServerEventManager` when you choose to use them.
 *
 * @example
 * ```typescript
 * // Resolve the platform-appropriate manager once at startup
 * const manager = EventContext.resolve();
 * manager.subscribe('order:placed', handler);
 *
 * // After aggregate mutations and repository.save():
 * for (const event of order.pullEvents()) {
 *     manager.dispatchEvent(event.type, event);
 * }
 * ```
 */
export const EventContext = {
	/**
	 * @description
	 * Resolves and returns the platform-appropriate `BaseEventManager` singleton.
	 *
	 * Detection order:
	 * 1. Node.js / Bun — detected via `process.versions?.node`
	 * 2. Browser       — detected via `globalThis.window`
	 *
	 * The resolved instance is cached after first resolution. Call `reset()`
	 * in tests if you need a clean state between environment switches.
	 *
	 * @returns The resolved `BaseEventManager` instance.
	 * @throws {Error} If the runtime environment cannot be determined.
	 */
	resolve(): BaseEventManager {
		if (managerCache) return managerCache;

		if (
			typeof process !== "undefined" &&
			process.versions?.node !== undefined
		) {
			managerCache = ServerEventManager.instance();
			return managerCache;
		}

		if (
			typeof globalThis !== "undefined" &&
			typeof globalThis.window !== "undefined"
		) {
			managerCache = BrowserEventManager.instance(
				globalThis.window as Window & typeof globalThis,
			);
			return managerCache;
		}

		throw new Error(
			"EventContext: unable to determine the runtime environment. " +
				"Neither a Node.js-compatible runtime nor a browser window was detected.",
		);
	},

	/**
	 * @description
	 * Resets the cached event manager instance.
	 *
	 * Intended for use in tests where environment switching or clean state
	 * between test cases is required. Not recommended in production code.
	 */
	__reset(): void {
		managerCache = null;
	},
};
