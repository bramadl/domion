import { DomainError } from "../helpers/domain-error";
import { DomainEvents } from "../helpers/domain-events";
import { EventContext } from "../helpers/event-context";
import { Result } from "../libs/result";
import type { IEntityProps, IEntitySettings } from "../types/entity.types";
import type {
	AggregateEventMetrics,
	BaseEventHandler,
	BaseEventManager,
	EventHandler,
	EventPriorityOptions,
} from "../types/event.types";
import type { IResult } from "../types/result.types";
import type { UID } from "../types/uid.types";
import type { AnyObject } from "../types/utils.types";
import { Entity } from "./entity";
import { ID } from "./id";

/**
 * @description
 * Represents an aggregate root — the consistency boundary of a domain model.
 *
 * An `Aggregate` extends `Entity` with domain event management capabilities.
 * It acts as the single entry point for mutations within its boundary, ensuring
 * that all invariants are maintained and that side effects are captured as events
 * to be dispatched after the operation succeeds.
 *
 * Domain events registered via `addEvent()` are held in memory and can be dispatched
 * all at once via `dispatchAll()`, or individually via `dispatchEvent()`. Events are
 * removed after dispatch to enforce a fire-once guarantee.
 *
 * @template Props The shape of the aggregate's domain properties.
 *
 * @example
 * ```typescript
 * class Order extends Aggregate<OrderProps> {
 *     private constructor(props: OrderProps) { super(props); }
 *
 *     public place(): void {
 *         this.addEvent('order:placed', async (aggregate) => {
 *             await notify(aggregate.id.value());
 *         });
 *     }
 *
 *     public static create(props: OrderProps): IResult<Order> {
 *         if (!this.isValidProps(props)) return Result.error('Invalid props');
 *         return Result.success(new Order(props));
 *     }
 * }
 * ```
 */
export class Aggregate<Props extends IEntityProps> extends Entity<Props> {
	/**
	 * @description
	 * Internal domain event collection for this aggregate instance.
	 */
	private domainEvents: DomainEvents<this>;

	/**
	 * @description
	 * Marker used by `Validator` to distinguish aggregates from regular entities.
	 *
	 * @internal
	 */
	protected readonly __aggregate = true as const;

	/**
	 * @description
	 * Running count of events that have been dispatched by this aggregate instance.
	 */
	private dispatchedCount = 0;

	/**
	 * @description
	 * Initializes a new `Aggregate` instance.
	 *
	 * @param props The domain properties for this aggregate.
	 * @param config Optional settings to disable getters or setters.
	 * @param events Optional pre-existing `DomainEvents` instance, used when cloning with `copyEvents`.
	 */
	constructor(
		props: Props,
		config?: IEntitySettings,
		events?: DomainEvents<Aggregate<Props>>,
	) {
		super(props, config);
		this.domainEvents = events
			? (events as unknown as DomainEvents<this>)
			: new DomainEvents(this);
	}

	/**
	 * @description
	 * Registers a domain event on this aggregate using either a structured
	 * `BaseEventHandler` instance or an inline handler function.
	 *
	 * If an event with the same name already exists, it is replaced.
	 *
	 * @param eventNameOrHandler The event name (string) or a `BaseEventHandler` instance.
	 * @param handler The handler function (required when `eventNameOrHandler` is a string).
	 * @param options Optional priority configuration.
	 *
	 * @throws {DomainError} If the event name is invalid or the handler is not a function.
	 *
	 * @example
	 * ```typescript
	 * // Inline handler
	 * order.addEvent('order:placed', async (aggregate) => {
	 *     await notify(aggregate.id.value());
	 * });
	 *
	 * // Structured handler
	 * order.addEvent(new OrderPlacedHandler());
	 * ```
	 */
	public addEvent(event: BaseEventHandler<this>): void;
	public addEvent(
		eventName: string,
		handler: EventHandler<this>,
		options?: EventPriorityOptions,
	): void;
	public addEvent(
		eventNameOrHandler: string | BaseEventHandler<this>,
		handler?: EventHandler<this>,
		options?: EventPriorityOptions,
	): void {
		if (typeof eventNameOrHandler === "string") {
			if (!handler) {
				throw new DomainError(
					`Handler is required when registering event "${eventNameOrHandler}" by name.`,
				);
			}
			this.domainEvents.addEvent(eventNameOrHandler, handler, options);
			return;
		}

		const structured = eventNameOrHandler as BaseEventHandler<this>;
		this.domainEvents.addEvent(
			structured.params.eventName,
			structured.dispatch as EventHandler<this>,
			structured.params.options,
		);
	}

	/**
	 * @description
	 * Removes all registered domain events from this aggregate.
	 *
	 * @param options.resetMetrics If `true`, resets the dispatched event counter to zero.
	 */
	public clearEvents(options: { resetMetrics?: boolean } = {}): void {
		if (options.resetMetrics) this.dispatchedCount = 0;
		this.domainEvents.clearEvents();
	}

	/**
	 * @description
	 * Creates a deep clone of this aggregate, optionally overriding some properties.
	 *
	 * Pass `{ copyEvents: true }` to carry over registered (undispatched) domain events
	 * to the cloned instance.
	 *
	 * @param props Optional partial properties and clone options.
	 * @returns A new instance of the same `Aggregate` subclass.
	 */
	public override clone(
		props?: Partial<Props> & { copyEvents?: boolean },
	): this {
		const proto = Reflect.getPrototypeOf(this);
		const ctor = proto?.constructor ?? this.constructor;

		// Destructure copyEvents out so it is never spread into domain props
		const { copyEvents, ...domainProps } = (props ?? {}) as Partial<Props> & {
			copyEvents?: boolean;
		};

		const merged = { ...this.props, ...domainProps };
		const clone = Reflect.construct(ctor, [merged, this.config]) as this;

		if (copyEvents) {
			clone.domainEvents = this.domainEvents.cloneFor(clone);
		}

		return clone;
	}

	/**
	 * @description
	 * Returns the application-level event manager for the current runtime environment.
	 * Backed by `EventContext`, which resolves to `ServerEventManager` or `BrowserEventManager`.
	 *
	 * @returns The platform-specific `BaseEventManager` instance.
	 */
	public context(): BaseEventManager {
		return EventContext.resolve();
	}

	/**
	 * @description
	 * Removes all events matching the provided event name.
	 *
	 * @param eventName The name of the event to remove.
	 * @returns The number of events removed.
	 */
	public deleteEvent(eventName: string): number {
		const before = this.domainEvents.metrics.totalEvents();
		this.domainEvents.removeEvent(eventName);
		return before - this.domainEvents.metrics.totalEvents();
	}

	/**
	 * @description
	 * Dispatches all registered domain events in priority order and clears the event collection.
	 *
	 * @returns A `Promise` that resolves once all handlers have settled.
	 * @throws Re-throws any error raised by an event handler.
	 */
	public async dispatchAll(): Promise<void> {
		const count = await this.domainEvents.dispatchAll();
		this.dispatchedCount += count;
	}

	/**
	 * @description
	 * Dispatches a single event by name. The event is removed after dispatch.
	 * Async handlers are awaited before `dispatchedCount` is incremented, ensuring
	 * the metric only reflects events that have fully settled.
	 *
	 * @param eventName The name of the event to dispatch.
	 * @param args Additional arguments forwarded to the event handler.
	 * @returns A `Promise` that resolves once the handler has settled.
	 */
	public async dispatchEvent(
		eventName: string,
		...args: unknown[]
	): Promise<void> {
		const dispatched = await this.domainEvents.dispatchEvent(
			eventName,
			...args,
		);
		if (dispatched) this.dispatchedCount++;
	}

	/**
	 * @description
	 * A metrics snapshot of this aggregate's domain event activity.
	 *
	 * @property current   Number of currently registered (undispatched) events.
	 * @property dispatch  Total number of events dispatched so far.
	 * @property total     Sum of current and dispatched events.
	 */
	public get eventsMetrics(): AggregateEventMetrics {
		return this.domainEvents.snapshot(this.dispatchedCount);
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
		const proto = Reflect.getPrototypeOf(this);
		const name = proto?.constructor?.name ?? "Aggregate";
		return ID.create(`[Aggregate@${name}]:${this._id.value()}`);
	}

	/**
	 * @description
	 * Creates a new `Aggregate` instance wrapped in a `Result`.
	 * Returns `Result.error()` if `isValidProps()` returns `false`.
	 *
	 * @param props The properties to validate and construct the aggregate with.
	 * @returns A `Result` containing the new instance on success, or an error on failure.
	 */
	public static override create(props: unknown): IResult<unknown, string> {
		// biome-ignore lint/complexity/noThisInStatic: Base factories must validate through the subclass constructor.
		if (!this.isValidProps(props)) {
			return Result.error(
				// biome-ignore lint/complexity/noThisInStatic: Error messages should name the concrete subclass.
				`Failed to create "${this.name}": invalid properties. ` +
					`Ensure all required fields are present and valid.`,
			);
		}
		return Result.success(new this(props as AnyObject));
	}
}
