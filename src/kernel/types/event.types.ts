/**
 * @description
 * Represents a domain event — an immutable record of something that happened
 * within an aggregate boundary.
 *
 * Domain events are plain data. They carry no behaviour, no handlers, and no
 * knowledge of how they will be consumed. The `type` field is the only
 * required identifier; every other field provides tracing context.
 *
 * Naming convention: past-tense, `aggregate:fact` format.
 * @example `'order:placed'`, `'user:registered'`, `'pokemon:caught'`
 *
 * @template TPayload The shape of the event-specific data.
 */
export interface DomainEvent<TPayload = unknown> {
	/**
	 * @description
	 * The event type identifier. Use past-tense, colon-separated format:
	 * `'<aggregate>:<fact>'` — e.g. `'order:placed'`, `'user:email-changed'`.
	 */
	readonly type: string;

	/**
	 * @description
	 * The string value of the aggregate's `id` at the time the event was emitted.
	 */
	readonly aggregateId?: string;

	/**
	 * @description
	 * The class name of the aggregate that emitted this event.
	 * Useful for logging, filtering, and debugging across aggregate boundaries.
	 *
	 * @example `'Order'`, `'User'`, `'Pokemon'`
	 */
	readonly aggregateName?: string;

	/**
	 * @description
	 * The timestamp at which this event was created inside the aggregate.
	 * Reflects domain time, not infrastructure time.
	 */
	readonly occurredAt?: Date;

	/**
	 * @description
	 * Event-specific data. Keep this flat and serializable — avoid class
	 * instances, functions, or circular references so the event can be safely
	 * transmitted across process boundaries.
	 */
	readonly payload?: TPayload;
}

/**
 * @description
 * Represents a generic browser / server event payload wrapper.
 * Used internally by `BrowserEventManager` and `ServerEventManager`.
 *
 * @internal
 */
export type DomainEventPayload = { detail?: unknown[] };

/**
 * @description
 * Stores a registered event name and its associated callback.
 * Used internally by the built-in event managers.
 *
 * @internal
 */
export interface EventEntry {
	eventName: string;
	callback: (event: DomainEventPayload) => void | Promise<void>;
}

/**
 * @description
 * Subscriber callback type — receives a fully-typed `DomainEvent` and may
 * return a `Promise` for async side effects.
 */
export type EventSubscriber<TPayload = unknown> = (
	event: DomainEvent<TPayload>,
) => void | Promise<void>;

/**
 * @description
 * Contract for an application-level event bus.
 *
 * Implement this interface to integrate any pub-sub mechanism — an in-process
 * `EventEmitter`, a Redis Streams adapter, BullMQ, NATS, or any other
 * transport — with the domain event system produced by `Aggregate.pullEvents()`.
 *
 * The library ships with a `EventBus` implementation that works
 * out-of-the-box in both Node.js and browser environments. Swap it for your
 * own at the application layer without touching any domain code.
 *
 * @example
 * ```typescript
 * class RedisEventBus implements IEventBus {
 *     async publish(event: DomainEvent): Promise<void> {
 *         await redis.xadd(event.type, '*', 'data', JSON.stringify(event));
 *     }
 *     async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
 *         for (const event of events) await this.publish(event);
 *     }
 * }
 * ```
 */
export interface IEventBus {
	/**
	 * @description Publishes a single domain event.
	 */
	publish(event: DomainEvent): Promise<void>;

	/**
	 * @description
	 * Publishes all domain events in the provided array.
	 * Implementations should preserve order.
	 */
	publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
}

/**
 * @description
 * Internal registry entry stored per event type.
 */
export interface SubscriberEntry {
	type: string;
	subscriber: EventSubscriber;
}
