import type { IEntityProps, IEntitySettings } from "../types/entity.types";
import type { DomainEvent } from "../types/event.types";
import type { UID } from "../types/uid.types";
import { Entity } from "./entity";
import { ID } from "./id";

/**
 * @description
 * Represents an aggregate root — the consistency boundary of a domain model.
 *
 * An `Aggregate` extends `Entity` with domain event collection. It is the
 * single entry point for mutations within its boundary: domain methods mutate
 * state and record **what happened** as `DomainEvent` objects via `emit()`.
 * Events are plain data — they carry no handlers and no knowledge of how they
 * will be consumed.
 *
 * After a successful `repository.save()`, the application layer drains the
 * event queue with `pullEvents()` and hands the events off to whatever
 * transport it uses (`EventBus`, Redis Streams, BullMQ, etc.).
 *
 * **Lifecycle**
 * ```
 * [Domain method] → emit(event)          records the fact
 * [App layer]     → repo.save(aggregate) persists state
 * [App layer]     → pullEvents()         drains the queue
 * [App layer]     → bus.publishAll(...)  delivers the facts
 * ```
 *
 * @template Props The shape of the aggregate's user-defined domain properties.
 *
 * @example
 * ```typescript
 * interface OrderProps { customerId: string; status: string; total: number }
 *
 * class Order extends Aggregate<OrderProps> {
 *     private constructor(props: EntityProps<OrderProps>) { super(props); }
 *
 *     public place(): void {
 *         this.change('status', 'placed');
 *         this.emit({
 *             type: 'order:placed',
 *             payload: { total: this.get('total') },
 *         });
 *     }
 *
 *     public static override isValidProps(props: unknown): boolean {
 *         return (
 *             typeof (props as OrderProps)?.customerId === 'string' &&
 *             typeof (props as OrderProps)?.total === 'number'
 *         );
 *     }
 * }
 *
 * // Application layer
 * const order = Order.init({ customerId: 'c-1', status: 'pending', total: 100 });
 * order.place();
 *
 * await orderRepository.save(order);          // persist first
 * await eventBus.publishAll(order.pullEvents()); // then publish
 * ```
 */
export abstract class Aggregate<
	Props extends IEntityProps,
> extends Entity<Props> {
	/**
	 * @description
	 * Marker used by `Validator.isAggregate()` to distinguish aggregates from
	 * plain entities without requiring an `instanceof` check.
	 * @internal
	 */
	protected readonly __aggregate = true as const;

	/**
	 * @description Pending domain events waiting to be pulled and published.
	 */
	private _domainEvents: DomainEvent[] = [];

	/**
	 * @description
	 * Initialises a new `Aggregate` instance.
	 *
	 * @param props  The domain properties for this aggregate.
	 * @param config Optional settings to disable getters or setters.
	 */
	protected constructor(props: Props, config?: IEntitySettings) {
		super(props, config);
	}

	/**
	 * @description
	 * Records a domain event on this aggregate.
	 *
	 * Call `emit()` inside domain methods after a successful state change to
	 * capture the fact as a `DomainEvent`. The `aggregateId`, `aggregateName`,
	 * and `occurredAt` fields are filled in automatically — only `type` and
	 * `payload` are required from the caller.
	 *
	 * Events are held in memory until `pullEvents()` is called.
	 *
	 * @param event A partial `DomainEvent` — `type` is required, `payload` is optional.
	 *
	 * @example
	 * ```typescript
	 * // Inline (most common)
	 * this.emit({ type: 'order:placed', payload: { total: 100 } });
	 *
	 * // Via BaseDomainEvent subclass (OOP style, optional)
	 * this.emit(new OrderPlacedEvent(this.id.value(), { total: 100 }));
	 * ```
	 */
	protected emit<TPayload = unknown>(
		event:
			| Pick<DomainEvent<TPayload>, "type" | "payload">
			| DomainEvent<TPayload>,
	): void {
		const aggregateName =
			Reflect.getPrototypeOf(this)?.constructor?.name ?? "Aggregate";

		const full: DomainEvent<TPayload> = Object.freeze({
			...(event as DomainEvent<TPayload>),
			aggregateId: this.id.value(),
			aggregateName,
			occurredAt: new Date(),
		});

		this._domainEvents.push(full as DomainEvent);
	}

	/**
	 * @description
	 * Returns all pending domain events and clears the internal queue.
	 *
	 * **Always call this after `repository.save()` succeeds**, never before —
	 * pulling before persist risks delivering events for a state that was never
	 * committed (phantom events).
	 *
	 * The returned array is frozen. If you need to inspect events without
	 * consuming them, use `peekEvents()` instead.
	 *
	 * @returns A frozen, ordered snapshot of all pending `DomainEvent` objects.
	 *
	 * @example
	 * ```typescript
	 * // Application layer (use case / command handler)
	 * await repo.save(order);
	 * await bus.publishAll(order.pullEvents());
	 * ```
	 */
	public pullEvents(): ReadonlyArray<DomainEvent> {
		const snapshot = Object.freeze([...this._domainEvents]);
		this._domainEvents = [];
		return snapshot;
	}

	/**
	 * @description
	 * Returns a snapshot of pending events **without** clearing the queue.
	 *
	 * Useful for logging, testing assertions, or conditional logic that needs
	 * to inspect events before deciding whether to publish them.
	 *
	 * @returns A frozen, ordered snapshot of the current pending events.
	 */
	public peekEvents(): ReadonlyArray<DomainEvent> {
		return Object.freeze([...this._domainEvents]);
	}

	/**
	 * @description
	 * Returns the number of domain events currently pending in the queue.
	 */
	public get eventCount(): number {
		return this._domainEvents.length;
	}

	/**
	 * @description
	 * Discards all pending domain events without publishing them.
	 *
	 * Use sparingly — in most cases events should be published, not discarded.
	 * Useful in tests or when an operation is rolled back before persist.
	 *
	 * @returns The number of events cleared.
	 */
	public clearEvents(): number {
		const count = this._domainEvents.length;
		this._domainEvents = [];
		return count;
	}

	/**
	 * @description
	 * Creates a deep clone of this aggregate, optionally overriding some properties.
	 *
	 * Pending domain events are **not** copied to the clone by default — events
	 * belong to the instance that produced them. Pass `{ withEvents: true }` to
	 * carry them over (e.g. when re-trying a failed publish).
	 *
	 * @param props Optional partial properties and clone options.
	 * @returns A new instance of the same `Aggregate` subclass.
	 */
	public override clone(
		props?: Partial<Props> & { withEvents?: boolean },
	): this {
		const proto = Reflect.getPrototypeOf(this);
		const ctor = proto?.constructor ?? this.constructor;

		const { withEvents, ...domainProps } = (props ?? {}) as Partial<Props> & {
			withEvents?: boolean;
		};

		const merged = { ...this.props, ...domainProps };
		const clone = Reflect.construct(ctor, [merged, this.config]) as this;

		if (withEvents) {
			clone._domainEvents = [...this._domainEvents];
		}

		return clone;
	}

	/**
	 * @description
	 * Generates a hash code for this aggregate combining its class name and ID.
	 *
	 * Format: `[Aggregate@ClassName]:UUID`
	 *
	 * @returns A `UID<string>` representing this aggregate's hash code.
	 */
	public override hashCode(): UID<string> {
		const name = Reflect.getPrototypeOf(this)?.constructor?.name ?? "Aggregate";
		return ID.create(`[Aggregate@${name}]:${this.id.value()}`);
	}
}
