import type {
	DomainEvent,
	EventSubscriber,
	IEventBus,
	SubscriberEntry,
} from "../types/event.types";

/**
 * @description
 * A simple, in-process event bus that ships with the library as a zero-config
 * default. Suitable for monolithic applications, unit tests, and any context
 * where events do not need to cross process or network boundaries.
 *
 * `EventBus` implements `IEventBus` so it can be swapped for any external
 * transport (Redis, NATS, BullMQ, etc.) without touching domain code.
 *
 * Subscribers are registered per `type` string and invoked in registration
 * order. Each subscriber runs independently — a failure in one does not
 * prevent the others from running.
 *
 * @example
 * ```typescript
 * const bus = new EventBus();
 *
 * // Register subscribers (application layer)
 * bus.subscribe('order:placed', async (event) => {
 *     await sendConfirmationEmail(event.payload.customerId);
 * });
 *
 * // Publish after repository.save() (application layer)
 * await repo.save(order);
 * await bus.publishAll(order.pullEvents());
 * ```
 */
export class EventBus implements IEventBus {
	private readonly entries: SubscriberEntry[] = [];

	/**
	 * @description
	 * Registers a subscriber for a specific event type.
	 *
	 * Multiple subscribers for the same `type` are all invoked when that event
	 * is published. Subscribing the same function twice for the same type will
	 * register it twice — callers are responsible for deduplication if needed.
	 *
	 * @param type       The event type to listen for, e.g. `'order:placed'`.
	 * @param subscriber The callback to invoke when a matching event is published.
	 */
	public subscribe<TPayload = unknown>(
		type: string,
		subscriber: EventSubscriber<TPayload>,
	): void {
		this.entries.push({
			type,
			subscriber: subscriber as EventSubscriber,
		});
	}

	/**
	 * @description
	 * Removes all subscribers for a given event type.
	 *
	 * @param type The event type whose subscribers should be removed.
	 * @returns The number of subscribers that were removed.
	 */
	public unsubscribe(type: string): number {
		const before = this.entries.length;
		const remaining = this.entries.filter((e) => e.type !== type);
		this.entries.splice(0, this.entries.length, ...remaining);
		return before - this.entries.length;
	}

	/**
	 * @description
	 * Publishes a single domain event, invoking all matching subscribers in
	 * registration order.
	 *
	 * Subscriber errors are caught and re-thrown after all subscribers have
	 * had a chance to run, collected as an `AggregateError`.
	 *
	 * @param event The domain event to publish.
	 * @throws {AggregateError} If one or more subscribers throw.
	 */
	public async publish(event: DomainEvent): Promise<void> {
		const matching = this.entries.filter((e) => e.type === event.type);
		const errors: unknown[] = [];

		for (const entry of matching) {
			try {
				await entry.subscriber(event);
			} catch (err) {
				errors.push(err);
			}
		}

		if (errors.length > 0) {
			throw new AggregateError(
				errors,
				`EventBus: ${errors.length} subscriber(s) failed for event "${event.type}".`,
			);
		}
	}

	/**
	 * @description
	 * Publishes all domain events in the provided array, in order.
	 * Each event is published independently — a failure in one event's
	 * subscribers does not prevent subsequent events from being published.
	 *
	 * Errors from all events are collected and thrown together as an
	 * `AggregateError` after all events have been processed.
	 *
	 * @param events The array of domain events to publish.
	 * @throws {AggregateError} If any subscriber across any event throws.
	 */
	public async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
		const errors: unknown[] = [];

		for (const event of events) {
			try {
				await this.publish(event);
			} catch (err) {
				// AggregateError from publish() — unwrap its inner errors
				if (err instanceof AggregateError) {
					errors.push(...err.errors);
				} else {
					errors.push(err);
				}
			}
		}

		if (errors.length > 0) {
			throw new AggregateError(
				errors,
				`EventBus: ${errors.length} error(s) occurred while publishing ${events.length} event(s).`,
			);
		}
	}

	/**
	 * @description
	 * Returns the number of subscribers currently registered for a given type.
	 * Useful for testing and diagnostics.
	 *
	 * @param type The event type to count subscribers for.
	 */
	public subscriberCount(type: string): number {
		return this.entries.filter((e) => e.type === type).length;
	}

	/**
	 * @description
	 * Removes all registered subscribers. Useful for test teardown.
	 */
	public clear(): void {
		this.entries.splice(0, this.entries.length);
	}
}
