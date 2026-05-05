import { describe, expect, test } from "bun:test";
import { BaseDomainEvent } from "../../../src/kernel/events/domain-event";

// ─── Fixtures ────────────────────────────────────────────────────────────────

interface OrderPlacedPayload {
	total: number;
	customerId: string;
}

class OrderPlacedEvent extends BaseDomainEvent<OrderPlacedPayload> {
	static readonly type = "order:placed";

	constructor(aggregateId: string, payload: OrderPlacedPayload) {
		super(OrderPlacedEvent.type, aggregateId, "Order", payload);
	}
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("[Core] DomainEvent", () => {
	describe("BaseDomainEvent", () => {
		test("assigns all properties correctly", () => {
			const event = new OrderPlacedEvent("order-1", {
				total: 100,
				customerId: "cust-1",
			});

			expect(event.type).toBe("order:placed");
			expect(event.aggregateId).toBe("order-1");
			expect(event.aggregateName).toBe("Order");
			expect(event.payload).toEqual({
				total: 100,
				customerId: "cust-1",
			});
		});

		test("automatically sets occurredAt as Date", () => {
			const event = new OrderPlacedEvent("order-1", {
				total: 100,
				customerId: "cust-1",
			});

			expect(event.occurredAt).toBeInstanceOf(Date);
		});

		test("each instance has unique occurredAt timestamp", async () => {
			const a = new OrderPlacedEvent("order-1", {
				total: 100,
				customerId: "cust-1",
			});

			await new Promise((r) => setTimeout(r, 2));

			const b = new OrderPlacedEvent("order-1", {
				total: 100,
				customerId: "cust-1",
			});

			expect(a.occurredAt.getTime()).not.toBe(b.occurredAt.getTime());
		});

		test("preserves payload reference (no cloning)", () => {
			const payload = { total: 100, customerId: "cust-1" };

			const event = new OrderPlacedEvent("order-1", payload);

			expect(event.payload).toBe(payload);
		});

		test("supports different payload shapes", () => {
			class NoPayloadEvent extends BaseDomainEvent<void> {
				constructor(id: string) {
					super("test:no-payload", id, "Test", undefined);
				}
			}

			const event = new NoPayloadEvent("1");

			expect(event.payload).toBeUndefined();
		});
	});
});