import type {
	AggregateEventMetrics,
	DomainEventEntry,
	EventHandler,
	EventMetrics,
	EventPriorityOptions,
} from "../types/event.types";
import { DomainError } from "./domain-error";

/**
 * @description
 * Manages the lifecycle of domain events scoped to a single aggregate instance.
 *
 * `DomainEvents` stores, validates, prioritizes, and dispatches events attached
 * to an aggregate. Events are dispatched in order of priority and removed after
 * dispatch to enforce a fire-once guarantee.
 *
 * This class is used internally by `Aggregate` and is not intended for direct
 * use by application code.
 *
 * @template T The aggregate type that owns these events.
 */
export class DomainEvents<T> {
	private events: DomainEventEntry<T>[] = [];
	private totalDispatched = 0;

	/**
	 * @description
	 * Creates a `DomainEvents` instance bound to the provided aggregate.
	 *
	 * @param aggregate The aggregate instance that owns these domain events.
	 */
	constructor(private readonly aggregate: T) {}

	/**
	 * @description
	 * Metrics reflecting the current and historical dispatch state of this event collection.
	 */
	public get metrics(): EventMetrics {
		return {
			totalDispatched: () => this.totalDispatched,
			totalEvents: () => this.events.length,
		};
	}

	/**
	 * @description
	 * Registers a new domain event. If an event with the same name already exists,
	 * it is replaced by the new one.
	 *
	 * @param eventName The name of the event. Must be a string of at least 3 characters.
	 * @param handler The function to invoke when the event is dispatched.
	 * @param options Optional priority configuration. Defaults to auto-assigned priority.
	 *
	 * @throws {DomainError} If the event name is invalid or the handler is not a function.
	 */
	public addEvent(
		eventName: string,
		handler: EventHandler<T>,
		options?: EventPriorityOptions,
	): void {
		this.assertValidEventName(eventName);
		this.assertValidHandler(eventName, handler);
		this.removeEvent(eventName);
		this.events.push({
			eventName,
			handler,
			options: options ?? { priority: this.nextPriority() },
		});
	}

	/**
	 * @description
	 * Removes all registered domain events from the collection.
	 */
	public clearEvents(): void {
		this.events = [];
	}

	/**
	 * @description
	 * Creates a new event collection for another aggregate using the same pending
	 * event definitions, without sharing mutable event state.
	 */
	public cloneFor<U>(aggregate: U): DomainEvents<U> {
		const clone = new DomainEvents(aggregate);
		clone.events = this.events.map((event) => ({
			eventName: event.eventName,
			handler: event.handler as unknown as EventHandler<U>,
			options: { ...event.options },
		}));
		return clone;
	}

	/**
	 * @description
	 * Dispatches a single event by name, invoking its handler with the aggregate and
	 * any additional arguments. The event is removed from the collection after dispatch.
	 *
	 * If no event with the given name is found, this method is a no-op.
	 *
	 * @param eventName The name of the event to dispatch.
	 * @param args Additional arguments forwarded to the event handler.
	 * @returns A `Promise` if the handler is async, otherwise `void`.
	 */
	public dispatchEvent(
		eventName: string,
		...args: unknown[]
	): boolean | Promise<boolean> {
		const event = this.events.find((e) => e.eventName === eventName);
		if (!event) return false;
		const result = event.handler(this.aggregate, [event, ...args]);
		if (result instanceof Promise) {
			return result.then(() => {
				this.totalDispatched++;
				this.removeEvent(eventName);
				return true;
			});
		}
		this.totalDispatched++;
		this.removeEvent(eventName);
		return true;
	}

	/**
	 * @description
	 * Dispatches all registered domain events in ascending priority order.
	 *
	 * Handlers are invoked sequentially to honour priority ordering — each async
	 * handler is awaited before the next one starts. The event collection is
	 * cleared after all handlers have settled.
	 *
	 * Errors thrown by any handler are propagated to the caller rather than
	 * swallowed, allowing the owning aggregate or application layer to decide
	 * how to handle failures.
	 *
	 * @returns A `Promise` that resolves once all handlers have settled.
	 * @throws Re-throws any error raised by an event handler.
	 */
	public async dispatchAll(): Promise<number> {
		const sorted = [...this.events].sort(
			(a, b) => a.options.priority - b.options.priority,
		);

		let dispatched = 0;
		for (const event of sorted) {
			// Await each handler sequentially so priority order is respected
			await event.handler(this.aggregate, [event]);
			this.totalDispatched++;
			dispatched++;
			this.removeEvent(event.eventName);
		}

		return dispatched;
	}

	/**
	 * @description
	 * Removes a specific event from the collection by name.
	 *
	 * @param eventName The name of the event to remove.
	 */
	public removeEvent(eventName: string): void {
		this.events = this.events.filter((e) => e.eventName !== eventName);
	}

	/**
	 * @description
	 * Returns a metrics snapshot compatible with the `AggregateEventMetrics` shape,
	 * combining internal metrics with the provided external dispatch count.
	 *
	 * @param externalDispatchCount The number of events already dispatched by the owning aggregate.
	 * @returns An `AggregateEventMetrics` snapshot.
	 */
	public snapshot(externalDispatchCount: number): AggregateEventMetrics {
		return {
			current: this.events.length,
			dispatch: externalDispatchCount,
			total: this.events.length + externalDispatchCount,
		};
	}

	/**
	 * @description
	 * Returns the next auto-assigned priority value.
	 * Priority starts at 1 and increments with each registered event, ensuring
	 * a unique, stable ordering for events registered without an explicit priority.
	 */
	private nextPriority(): number {
		return this.events.length + 1;
	}

	private assertValidEventName(eventName: string): void {
		if (typeof eventName !== "string" || eventName.length < 3) {
			throw new DomainError(
				`Invalid event name "${eventName}". Event names must be strings of at least 3 characters.`,
			);
		}
	}

	private assertValidHandler(eventName: string, handler: unknown): void {
		if (typeof handler !== "function") {
			throw new DomainError(
				`Handler for event "${eventName}" is not a function.`,
			);
		}
	}
}
