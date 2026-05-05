import type { DomainEventPayload, EventEntry } from "../types/event.types";
import { BaseEventManager } from "./event-manager";
import { ValidateEventName } from "./event-utils";

/**
 * @description
 * Duck-typed interface for the browser `window` object.
 *
 * Using a structural type instead of `Window & typeof globalThis` keeps this
 * module free of DOM lib dependencies, making the library usable in projects
 * that do not include `"lib": ["DOM"]` in their tsconfig.
 */
export interface WindowLike {
	dispatchEvent(event: Event): boolean;
	addEventListener(
		type: string,
		listener: (event: Event) => void,
		options?: boolean | AddEventListenerOptions,
	): void;
	removeEventListener(
		type: string,
		listener: (event: Event) => void,
		options?: boolean | EventListenerOptions,
	): void;
	sessionStorage: {
		getItem(key: string): string | null;
		setItem(key: string, value: string): void;
		removeItem(key: string): void;
	};
	CustomEvent: new <T>(
		type: string,
		eventInitDict?: { bubbles?: boolean; detail?: T },
	) => Event;
}

/**
 * @description
 * Browser-side singleton event manager backed by the native `window` CustomEvent API.
 *
 * Manages application-level event subscriptions and dispatches for browser environments.
 * Subscriptions are persisted in `sessionStorage` so their existence can be detected
 * across re-renders. Listeners are automatically cleaned up on page unload.
 *
 * Supports wildcard event dispatch using `*` as a glob-style pattern.
 *
 * Use `EventContext.resolve()` to obtain this instance rather than constructing it directly.
 * For most use cases, prefer `EventBus` — use this only when you need to tap into
 * the native browser CustomEvent system.
 *
 * @example
 * ```typescript
 * const manager = BrowserEventManager.instance(window);
 *
 * manager.subscribe('order:placed', (event) => {
 *     console.log(event.detail);
 * });
 *
 * manager.dispatchEvent('order:placed', { orderId: '123' });
 * ```
 */
export class BrowserEventManager extends BaseEventManager {
	private static _instance: BrowserEventManager;
	private readonly entries: EventEntry[] = [];
	private readonly storagePrefix = "browser:event:";
	private initialized = false;

	private constructor(private readonly win: WindowLike) {
		super();
		if (typeof win === "undefined" || win === null) {
			throw new Error("BrowserEventManager requires a valid window object.");
		}
	}

	/**
	 * @description
	 * Returns the singleton `BrowserEventManager` instance, creating it if necessary.
	 *
	 * @param win The browser `window` object (or any `WindowLike` implementation).
	 * @returns The singleton `BrowserEventManager`.
	 * @throws {Error} If called outside a browser environment.
	 */
	public static instance(win: WindowLike): BrowserEventManager {
		if (!BrowserEventManager._instance) {
			BrowserEventManager._instance = new BrowserEventManager(win);
		}
		return BrowserEventManager._instance;
	}

	/**
	 * @description
	 * Checks whether an event with the given name is currently registered.
	 *
	 * Checks both the internal entry list and `sessionStorage` for persistence
	 * across re-renders.
	 *
	 * @param eventName The event name to check.
	 * @returns `true` if the event is registered.
	 */
	public exists(eventName: string): boolean {
		const inStorage = !!this.win.sessionStorage.getItem(
			this.storagePrefix + eventName,
		);
		const inEntries = this.entries.some((e) => e.eventName === eventName);
		return inStorage || inEntries;
	}

	/**
	 * @description
	 * Dispatches a custom event by name, forwarding optional arguments as the `detail` payload.
	 *
	 * Supports wildcard patterns — if `eventName` contains `*`, all registered events
	 * whose names match the resulting regex are dispatched.
	 *
	 * @param eventName The event name or wildcard pattern to dispatch.
	 * @param args Additional arguments forwarded as `detail` to handlers.
	 */
	public dispatchEvent(eventName: string, ...args: unknown[]): void {
		ValidateEventName(eventName);

		if (eventName.includes("*")) {
			const regex = new RegExp(eventName.replace("*", ".*"));
			for (const entry of this.entries) {
				if (regex.test(entry.eventName)) {
					this.win.dispatchEvent(
						new this.win.CustomEvent(entry.eventName, {
							bubbles: true,
							detail: args,
						}),
					);
				}
			}
			return;
		}

		this.win.dispatchEvent(
			new this.win.CustomEvent(eventName, {
				bubbles: true,
				detail: args,
			}),
		);
	}

	/**
	 * @description
	 * Removes a registered event, cleaning up its listener and `sessionStorage` entry.
	 *
	 * @param eventName The name of the event to remove.
	 * @returns `true` if the event was found and removed; `false` otherwise.
	 */
	public removeEvent(eventName: string): boolean {
		// this.win.sessionStorage.removeItem(this.storagePrefix + eventName);
		// const entry = this.entries.find((e) => e.eventName === eventName);
		// if (!entry) return false;
		// this.entries.splice(this.entries.indexOf(entry), 1);
		// // Cast through unknown — the callback is structurally compatible at runtime
		// // (CustomEvent extends Event), but TypeScript cannot verify this statically.
		// this.win.removeEventListener(
		// 	eventName,
		// 	entry.callback as unknown as (event: Event) => void,
		// );
		// return true;
		const matching = this.entries.filter((e) => e.eventName === eventName);

		if (matching.length === 0) return false;

		// Remove from entries
		this.entries.splice(
			0,
			this.entries.length,
			...this.entries.filter((e) => e.eventName !== eventName),
		);

		// Remove all listeners
		for (const entry of matching) {
			this.win.removeEventListener(
				eventName,
				entry.callback as unknown as (event: Event) => void,
			);
		}

		// Remove storage
		this.win.sessionStorage.removeItem(this.storagePrefix + eventName);

		return true;
	}

	/**
	 * @description
	 * Subscribes a callback to the specified event name using the native `window` event system.
	 *
	 * Persists the subscription in `sessionStorage` and registers a `beforeunload`
	 * cleanup listener. If the event is already registered, this call is a no-op.
	 *
	 * Event names must follow the `context:EventName` format.
	 *
	 * @param eventName The event name to subscribe to.
	 * @param fn The callback to invoke when the event is dispatched.
	 *
	 * @throws {DomainError} If the event name does not follow the required format.
	 */
	public subscribe(
		eventName: string,
		fn: (event: DomainEventPayload) => void | Promise<void>,
	): void {
		ValidateEventName(eventName);

		this.entries.push({ eventName, callback: fn });
		this.win.sessionStorage.setItem(
			this.storagePrefix + eventName,
			Date.now().toString(),
		);
		this.win.addEventListener(
			eventName,
			fn as unknown as (event: Event) => void,
		);
		if (!this.initialized) {
			this.win.addEventListener("beforeunload", () => {
				for (const entry of this.entries) {
					this.win.sessionStorage.removeItem(
						this.storagePrefix + entry.eventName,
					);
				}
			});

			this.initialized = true;
		}
	}

	/**
	 * @description
	 * Resets the cached event manager instance.
	 *
	 * Intended for use in tests where environment switching or clean state
	 * between test cases is required. Not recommended in production code.
	 *
	 * @internal
	 */
	public static __reset(): void {
		BrowserEventManager._instance = undefined as unknown as BrowserEventManager;
	}
}
