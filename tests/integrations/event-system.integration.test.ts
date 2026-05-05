import { describe, test, expect, beforeEach } from "bun:test";

import { Aggregate } from "../../src/kernel/core/aggregate";
import { EventBus } from "../../src/kernel/events/event-bus";
import { BrowserEventManager } from "../../src/kernel/events/browser-event-manager";
import { ServerEventManager } from "../../src/kernel/events/server-event-manager";
import { EventContext } from "../../src/kernel/events/event-context";

// ------------------------------
// 🧱 Test Aggregate
// ------------------------------

interface OrderProps {
	customerId: string;
	status: "pending" | "placed";
	total: number;
}

class Order extends Aggregate<OrderProps> {
	private constructor(props: OrderProps) {
		super(props);
	}

	public place(): void {
		this.change("status", "placed");
		this.emit({
			type: "order:placed",
			payload: {
				total: this.get("total"),
			},
		});
	}

	public static override isValidProps(props: OrderProps): boolean {
		return (
      this.validator.isString(props.customerId)&&
			this.validator.isNumber(props.total) &&
      this.validator.string(props.status).isEqual("pending") ||
      this.validator.string(props.status).isEqual("placed")
		);
	}
}

// ------------------------------
// 🔁 Integration Test
// ------------------------------

describe("[Integration] Event System", () => {
	let bus: EventBus;

	beforeEach(() => {
		BrowserEventManager.__reset();
		ServerEventManager.__reset();
		EventContext.__reset()

		bus = new EventBus();
	});

	test("Aggregate → emits → EventBus → subscriber receives", async () => {
		let received = false;

		bus.subscribe("order:placed", async (event) => {
			received = true;

			expect(event.type).toBe("order:placed");
			expect(event.payload).toEqual({ total: 100 });
		});

		const order = Order.init({
			customerId: "c-1",
			status: "pending",
			total: 100,
		});

		order.place();

		const events = order.pullEvents();

		await bus.publishAll(events);

		expect(received).toBe(true);
	});

	test("multiple events are published in order", async () => {
		const received: string[] = [];

		bus.subscribe("order:placed", async () => {
			received.push("placed");
		});

		const order = Order.init({
			customerId: "c-1",
			status: "pending",
			total: 100,
		});

		order.place();
		order.place();

		await bus.publishAll(order.pullEvents());

		expect(received).toEqual(["placed", "placed"]);
	});

	test("async subscriber is awaited properly", async () => {
		let finished = false;

		bus.subscribe("order:placed", async () => {
			await new Promise((r) => setTimeout(r, 10));
			finished = true;
		});

		const order = Order.init({
			customerId: "c-1",
			status: "pending",
			total: 100,
		});

		order.place();

		await bus.publishAll(order.pullEvents());

		expect(finished).toBe(true);
	});

	test("failure in one subscriber does not stop others", async () => {
		let successCalled = false;

		bus.subscribe("order:placed", async () => {
			throw new Error("fail");
		});

		bus.subscribe("order:placed", async () => {
			successCalled = true;
		});

		const order = Order.init({
			customerId: "c-1",
			status: "pending",
			total: 100,
		});

		order.place();

		expect(async () => {
			await bus.publishAll(order.pullEvents());
		}).toThrow();

		expect(successCalled).toBe(true);
	});

	test("no events → nothing happens", async () => {
		const order = Order.init({
			customerId: "c-1",
			status: "pending",
			total: 100,
		});

		expect(async () => {
			await bus.publishAll(order.pullEvents());
		}).not.toThrow();
	});
});