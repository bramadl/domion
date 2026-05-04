/**
 * @description
 * Metrics snapshot exposed on an Aggregate instance.
 */
export interface AggregateEventMetrics {
	current: number;
	dispatch: number;
	total: number;
}

/**
 * @description
 * An asynchronous event handler function.
 *
 * @template T The aggregate type.
 */
export type AsyncEventHandler<T> = (
	aggregate: T,
	args: [DomainEventEntry<T>, ...unknown[]],
) => Promise<void>;

/**
 * @description
 * Abstract base class for structured domain event handlers.
 * Extend this to define reusable, named event handlers for an aggregate.
 *
 * @template T The aggregate type this handler is associated with.
 *
 * @example
 * ```typescript
 * class OrderPlacedHandler extends BaseEventHandler<Order> {
 *     constructor() {
 *         super({ eventName: 'order:placed' });
 *     }
 *
 *     dispatch(aggregate: Order): void {
 *         console.log('Order placed:', aggregate.id.value());
 *     }
 * }
 * ```
 */
export abstract class BaseEventHandler<T> {
	constructor(public readonly params: EventHandlerParams) {
		if (typeof params?.eventName !== "string") {
			throw new Error("params.eventName is required as string");
		}
		this.dispatch = this.dispatch.bind(this);
	}

	abstract dispatch(
		aggregate: T,
		args: [DomainEventEntry<T>, ...unknown[]],
	): Promise<void> | void;
}

/**
 * @description
 * Abstract class defining the contract for an application-level event manager.
 * Implemented separately for browser and server environments.
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

/**
 * @description
 * Represents a stored domain event with its handler and priority options.
 *
 * @template T The aggregate type this event is associated with.
 */
export interface DomainEventEntry<T> {
	eventName: string;
	handler: EventHandler<T>;
	options: EventPriorityOptions;
}

/**
 * @description
 * Represents a generic browser/server event payload.
 */
export type DomainEventPayload = { detail?: unknown[] };

/**
 * @description
 * Stores a registered event name and its associated callback.
 */
export interface EventEntry {
	eventName: string;
	callback: (event: DomainEventPayload) => void | Promise<void>;
}

/**
 * @description
 * An event handler — either synchronous or asynchronous.
 *
 * @template T The aggregate type.
 */
export type EventHandler<T> = AsyncEventHandler<T> | SyncEventHandler<T>;

/**
 * @description
 * Parameters for configuring a structured event handler class.
 */
export interface EventHandlerParams {
	eventName: string;
	options?: EventPriorityOptions;
}

/**
 * @description
 * Metrics interface for tracking event dispatch state.
 */
export interface EventMetrics {
	totalDispatched(): number;
	totalEvents(): number;
}

/**
 * @description
 * Priority configuration for a domain event.
 */
export interface EventPriorityOptions {
	priority: number;
}

/**
 * @description
 * A synchronous event handler function.
 *
 * @template T The aggregate type.
 */
export type SyncEventHandler<T> = (
	aggregate: T,
	args: [DomainEventEntry<T>, ...unknown[]],
) => void;
