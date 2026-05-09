import type { DomainEvent } from "../types/event.types";

/**
 * @description
 * Abstract base class for defining strongly-typed domain events.
 *
 * Extend this class when you want an OOP-style event definition with a fixed
 * `type` string baked into the class. The `aggregateId`, `aggregateName`, and
 * `occurredAt` fields are set automatically by `Aggregate.emit()` — subclasses
 * only need to declare the `payload` shape.
 *
 * Using this base class is **optional**. `Aggregate.emit()` accepts any object
 * conforming to `DomainEvent<TPayload>` — a plain object literal works equally
 * well. Prefer this class when you want a reusable, self-describing event type
 * that can be imported and checked with `instanceof`.
 *
 * @template TPayload The shape of the event-specific data.
 *
 * @example
 * ```typescript
 * // Define the event
 * interface OrderPlacedPayload { total: number; customerId: string }
 *
 * class OrderPlacedEvent extends BaseDomainEvent<OrderPlacedPayload> {
 *     static readonly type = 'order:placed' as const;
 *
 *     constructor(aggregateId: string, payload: OrderPlacedPayload) {
 *         super(OrderPlacedEvent.type, aggregateId, 'Order', payload);
 *     }
 * }
 *
 * // Inside an Aggregate subclass
 * class Order extends Aggregate<OrderProps> {
 *     public place(): void {
 *         this.change('status', 'placed');
 *         this.emit(new OrderPlacedEvent(this.id.value(), {
 *             total: this.get('total'),
 *             customerId: this.get('customerId'),
 *         }));
 *     }
 * }
 *
 * // Application layer
 * order.place();
 * await repo.save(order);
 * await eventBus.publishAll(order.pullEvents());
 * ```
 */
export abstract class BaseDomainEvent<TPayload = unknown>
	implements DomainEvent<TPayload>
{
	readonly type: string;
	readonly aggregateId: string;
	readonly aggregateName: string;
	readonly occurredAt: Date;
	readonly payload: TPayload;

	/**
	 * @param type          The event type identifier, e.g. `'order:placed'`.
	 * @param aggregateId   The `id.value()` of the aggregate that emitted this event.
	 * @param aggregateName The class name of the aggregate, e.g. `'Order'`.
	 * @param payload       Event-specific data. Keep flat and serializable.
	 */
	constructor(
		type: string,
		aggregateId: string,
		aggregateName: string,
		payload: TPayload,
	) {
		this.type = type;
		this.aggregateId = aggregateId;
		this.aggregateName = aggregateName;
		this.occurredAt = new Date();
		this.payload = payload;
	}
}
