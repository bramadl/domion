import { describe, expect, test } from "bun:test";

import { Aggregate, DomainError } from "../../../src/kernel";

// ─── Fixtures ────────────────────────────────────────────────────────────────

interface OrderProps {
	status: string;
	total: number;
}

class Order extends Aggregate<OrderProps> {
	private constructor(props: OrderProps) {
		super(props);
	}

	public static override isValidProps(props: OrderProps): boolean {
		return (
			!Order.validator.isNull(props) &&
			Order.validator.isObject(props) &&
			Order.validator.isString(props.status) &&
			!Order.validator.string(props.status).isEmpty() &&
			Order.validator.isNumber(props.total) &&
			Order.validator.number(props.total).isPositive()
		);
	}

	public place() {
		this.change("status", "placed");
		this.emit({
			type: "order:placed",
			payload: { total: this.get("total") },
		});
	}

	public cancel() {
		this.change("status", "cancelled");
		this.emit({
			type: "order:cancelled",
		});
	}
}

const wait = () => new Promise<void>((r) => setTimeout(r, 2));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("[Core] Aggregate", () => {
	describe("Inheritance (Entity behavior)", () => {
		test("inherits Entity.create()", () => {
			const result = Order.create({ status: "pending", total: 100 });

			expect(result.isSuccess()).toBe(true);
			expect(result.value()).toBeInstanceOf(Order);
		});

		test("inherits Entity.init()", () => {
			const order = Order.init({ status: "pending", total: 100 });

			expect(order).toBeInstanceOf(Order);
			expect(order.get("status")).toBe("pending");
		});

		test("invalid props throw DomainError via init()", () => {
			expect(() =>
				Order.init({ status: "", total: 100 } as unknown as OrderProps),
			).toThrow(DomainError);
		});
	});

	describe("Domain Events", () => {
		describe("emit()", () => {
			test("records a domain event with auto-filled metadata", () => {
				const order = Order.init({ status: "pending", total: 100 });

				order.place();

				const events = order.peekEvents();
				expect(events).toHaveLength(1);

				const event = events[0]!;
				expect(event).toMatchObject({
					type: "order:placed",
					payload: { total: 100 },
					aggregateId: order.id.value(),
					aggregateName: "Order",
				});
				expect(event.occurredAt).toBeInstanceOf(Date);
			});

			test("supports emitting event without payload", () => {
				const order = Order.init({ status: "pending", total: 100 });

				order.cancel();

				const events = order.peekEvents();
				expect(events).toHaveLength(1);

				const event = events[0]!;
				expect(event.type).toBe("order:cancelled");
				expect(event.payload).toBeUndefined();
			});

			test("event object is frozen (immutable)", () => {
				const order = Order.init({ status: "pending", total: 100 });

				order.place();

				const event = order.peekEvents()[0];

				expect(Object.isFrozen(event)).toBe(true);
			});
		});

		describe("peekEvents()", () => {
			test("returns snapshot without clearing events", () => {
				const order = Order.init({ status: "pending", total: 100 });

				order.place();

				const first = order.peekEvents();
				const second = order.peekEvents();

				expect(first.length).toBe(1);
				expect(second.length).toBe(1);
			});

			test("returns frozen array", () => {
				const order = Order.init({ status: "pending", total: 100 });

				order.place();

				const events = order.peekEvents();

				expect(Object.isFrozen(events)).toBe(true);
			});
		});

		describe("pullEvents()", () => {
			test("returns events and clears internal queue", () => {
				const order = Order.init({ status: "pending", total: 100 });

				order.place();

				const events = order.pullEvents();

				expect(events.length).toBe(1);
				expect(order.peekEvents().length).toBe(0);
			});

			test("returns frozen snapshot", () => {
				const order = Order.init({ status: "pending", total: 100 });

				order.place();

				const events = order.pullEvents();

				expect(Object.isFrozen(events)).toBe(true);
			});
		});

		describe("eventCount", () => {
			test("returns correct number of pending events", () => {
				const order = Order.init({ status: "pending", total: 100 });

				expect(order.eventCount).toBe(0);

				order.place();
				order.cancel();

				expect(order.eventCount).toBe(2);
			});
		});

		describe("clearEvents()", () => {
			test("clears all events and returns count", () => {
				const order = Order.init({ status: "pending", total: 100 });

				order.place();
				order.cancel();

				const cleared = order.clearEvents();

				expect(cleared).toBe(2);
				expect(order.eventCount).toBe(0);
			});
		});
	});

	describe("Instance Methods", () => {
		describe("clone()", () => {
			test("clones without copying events by default", () => {
				const order = Order.init({ status: "pending", total: 100 });
				order.place();

				const cloned = order.clone();

				expect(cloned).toBeInstanceOf(Order);
				expect(cloned).not.toBe(order);
				expect(cloned.eventCount).toBe(0);
			});

			test("clones WITH events when withEvents = true", () => {
				const order = Order.init({ status: "pending", total: 100 });
				order.place();

				const cloned = order.clone({ withEvents: true });

				expect(cloned.eventCount).toBe(1);
				expect(cloned.peekEvents()).toHaveLength(1);
			});

			test("overrides props while cloning", () => {
				const order = Order.init({ status: "pending", total: 100 });

				const cloned = order.clone({ status: "placed" });

				expect(cloned.get("status")).toBe("placed");
				expect(order.get("status")).toBe("pending");
			});
		});

		describe("hashCode()", () => {
			test("format is [Aggregate@ClassName]:uuid", () => {
				const order = Order.init({ status: "pending", total: 100 });

				expect(order.hashCode().value()).toMatch(/^\[Aggregate@Order\]:.+$/);
			});

			test("different instances produce different hash codes", () => {
				const a = Order.init({ status: "pending", total: 100 });
				const b = Order.init({ status: "pending", total: 100 });

				expect(a.hashCode().value()).not.toBe(b.hashCode().value());
			});
		});
	});

	describe("Event lifecycle consistency", () => {
		test("events persist until pulled or cleared", async () => {
			const order = Order.init({ status: "pending", total: 100 });

			order.place();

			await wait();

			expect(order.eventCount).toBe(1);
		});

		test("pullEvents() empties queue but does not affect future emits", () => {
			const order = Order.init({ status: "pending", total: 100 });

			order.place();
			order.pullEvents();

			order.cancel();

			expect(order.eventCount).toBe(1);

			const events = order.peekEvents();
			expect(events).toHaveLength(1);

			const event = events[0]!;
			expect(event.type).toBe("order:cancelled");
		});
	});
});
