import { EventEmitter } from "node:events";
import type { DomainEventPayload, EventEntry } from "../types/event.types";
import { BaseEventManager } from "./event-manager";
import { ValidateEventName } from "./event-utils";

/**
 * @description
 * Server-side singleton event manager backed by Node.js `EventEmitter`.
 *
 * Manages application-level event subscriptions and dispatches for server
 * environments (Node.js, Bun, Deno). Supports wildcard event dispatch using
 * `*` as a glob-style pattern.
 *
 * Use `EventContext.resolve()` to obtain this instance rather than
 * constructing it directly. For most use cases, prefer `EventBus` —
 * use this only when you need direct access to the `EventEmitter` transport.
 *
 * @example
 * ```typescript
 * const manager = ServerEventManager.instance();
 *
 * manager.subscribe('order:placed', (event) => {
 *     console.log(event.detail);
 * });
 *
 * manager.dispatchEvent('order:placed', { orderId: '123' });
 * ```
 */
export class ServerEventManager extends BaseEventManager {
	private static _instance: ServerEventManager;
	private readonly emitter: EventEmitter;
	private readonly entries: EventEntry[] = [];

	private constructor() {
		super();
		// Use `process.versions?.node` instead of just `process` to avoid false
		// positives in bundled browser environments where `process` may be polyfilled
		// by Webpack / Vite but `process.versions.node` is never set.
		if (
			typeof process === "undefined" ||
			process.versions?.node === undefined ||
			typeof EventEmitter === "undefined"
		) {
			throw new Error(
				"ServerEventManager is not supported in this environment.",
			);
		}
		this.emitter = new EventEmitter({ captureRejections: true });
	}

	/**
	 * @description
	 * Returns the singleton `ServerEventManager` instance, creating it if necessary.
	 *
	 * @returns The singleton `ServerEventManager`.
	 * @throws {Error} If called outside a Node.js-compatible environment.
	 */
	public static instance(): ServerEventManager {
		if (!ServerEventManager._instance) {
			ServerEventManager._instance = new ServerEventManager();
		}
		return ServerEventManager._instance;
	}

	/**
	 * @description
	 * Checks whether an event with the given name is currently registered.
	 *
	 * @param eventName The event name to check.
	 * @returns `true` if at least one listener exists for this event name.
	 */
	public exists(eventName: string): boolean {
		return (
			this.emitter.listenerCount(eventName) > 0 ||
			this.entries.some((e) => e.eventName === eventName)
		);
	}

	/**
	 * @description
	 * Dispatches an event by name, forwarding optional arguments as the `detail` payload.
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
					this.emitter.emit(entry.eventName, { detail: args });
				}
			}
			return;
		}

		this.emitter.emit(eventName, { detail: args });
	}

	/**
	 * @description
	 * Removes a registered event and its associated listener.
	 *
	 * @param eventName The name of the event to remove.
	 * @returns `true` if the event was found and removed; `false` otherwise.
	 */
	public removeEvent(eventName: string): boolean {
		// const entry = this.entries.find((e) => e.eventName === eventName);
		// if (!entry) return false;
		// this.entries.splice(this.entries.indexOf(entry), 1);
		// this.emitter.removeListener(eventName, entry.callback);
		// return true;

		const matching = this.entries.filter((e) => e.eventName === eventName);

		if (matching.length === 0) return false;
		this.entries.splice(
			0,
			this.entries.length,
			...this.entries.filter((e) => e.eventName !== eventName),
		);

		for (const entry of matching) {
			this.emitter.removeListener(eventName, entry.callback);
		}

		return true;
	}

	/**
	 * @description
	 * Subscribes a callback to the specified event name.
	 *
	 * If an event with the same name is already registered, this call is a no-op.
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
		this.emitter.addListener(eventName, fn);
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
		ServerEventManager._instance = undefined as unknown as ServerEventManager;
	}
}
