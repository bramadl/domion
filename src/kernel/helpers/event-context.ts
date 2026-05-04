import type { BaseEventManager } from "../types/event.types";
import { BrowserEventManager } from "./browser-event-manager";
import { ServerEventManager } from "./server-event-manager";

/**
 * @description
 * Internal cache for the resolved event manager instance.
 */
let managerCache: BaseEventManager | null = null;

/**
 * @description
 * Provides a platform-aware mechanism for resolving the appropriate application-level
 * event manager instance at runtime.
 *
 * `EventContext` detects whether the current environment is Node.js or a browser,
 * then initializes and returns the corresponding singleton `BaseEventManager`:
 * - Node.js / Bun / Deno → `ServerEventManager`
 * - Browser              → `BrowserEventManager`
 *
 * Detection uses `process.versions?.node` rather than just `process` to avoid
 * false positives in bundled browser environments (Webpack/Vite) where `process`
 * may be polyfilled.
 */
export const EventContext = {
	/**
	 * @description
	 * Resolves and returns the platform-appropriate `BaseEventManager` singleton.
	 *
	 * Detection order:
	 * 1. Node.js / Bun — detected via `process.versions?.node` (immune to bundler polyfills)
	 * 2. Browser       — detected via `globalThis.window`
	 *
	 * The resolved instance is cached after first resolution. Call `reset()` in tests
	 * if you need a clean state between environment switches.
	 *
	 * @returns The resolved `BaseEventManager` instance.
	 * @throws {Error} If the runtime environment cannot be determined.
	 */
	resolve(): BaseEventManager {
		if (managerCache) {
			return managerCache;
		}

		// Check for a real Node.js / Bun runtime.
		// `process.versions.node` is only present in actual Node-compatible runtimes,
		// not in browser bundles that polyfill `process`.
		if (
			typeof process !== "undefined" &&
			process.versions?.node !== undefined
		) {
			managerCache = ServerEventManager.instance();
			return managerCache;
		}

		// Browser environment
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
	reset(): void {
		managerCache = null;
	},
};
