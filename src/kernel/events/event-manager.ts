import type { DomainEventPayload } from "../types/event.types";

/**
 * @description
 * Abstract base class for the built-in event manager implementations
 * (`BrowserEventManager`, `ServerEventManager`).
 *
 * Application code that depends only on `IEventBus` does not need this class.
 * It is exposed for library consumers who want to extend or replace the
 * built-in transport layer.
 */
export abstract class BaseEventManager {
	abstract subscribe(
		eventName: string,
		fn: (event: DomainEventPayload) => void | Promise<void>,
	): void;
	abstract exists(eventName: string): boolean;
	abstract removeEvent(eventName: string): boolean;
	abstract dispatchEvent(eventName: string, ...args: unknown[]): void;
}
