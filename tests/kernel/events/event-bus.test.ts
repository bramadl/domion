import { describe, expect, test } from "bun:test";
import { EventBus } from "../../../src/kernel/events/event-bus";
import type { DomainEvent } from "../../../src/kernel/types/event.types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const createEvent = (type: string): DomainEvent => ({
	type,
	aggregateId: "1",
	aggregateName: "Test",
	occurredAt: new Date(),
	payload: {},
});

const wait = () => new Promise<void>((r) => setTimeout(r, 2));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("[Core] EventBus", () => {
	describe("Subscription", () => {
		test("registers a subscriber", () => {
			const bus = new EventBus();

			const fn = () => {};
			bus.subscribe("test:event", fn);

			expect(bus.subscriberCount("test:event")).toBe(1);
		});

		test("supports multiple subscribers for same type", () => {
			const bus = new EventBus();

			bus.subscribe("test:event", () => {});
			bus.subscribe("test:event", () => {});

			expect(bus.subscriberCount("test:event")).toBe(2);
		});

		test("allows duplicate subscribers (no deduplication)", () => {
			const bus = new EventBus();

			const fn = () => {};
			bus.subscribe("test:event", fn);
			bus.subscribe("test:event", fn);

			expect(bus.subscriberCount("test:event")).toBe(2);
		});

    test("handles async subscriber rejection", async () => {
      const bus = new EventBus();

      bus.subscribe("test:event", async () => {
        await wait();
        throw new Error("async fail");
      });

      try {
        await bus.publish(createEvent("test:event"));
      } catch (err) {
        expect(err).toBeInstanceOf(AggregateError);

        const e = err as AggregateError;
        expect(e.errors.length).toBe(1);
        expect((e.errors[0] as Error).message).toBe("async fail");
      }
    });

    test("subscriberCount handles mixed types correctly", () => {
      const bus = new EventBus();

      bus.subscribe("a", () => {});
      bus.subscribe("b", () => {});
      bus.subscribe("a", () => {});

      expect(bus.subscriberCount("a")).toBe(2);
      expect(bus.subscriberCount("b")).toBe(1);
      expect(bus.subscriberCount("c")).toBe(0); // <- penting
    });
	});

	describe("Unsubscription", () => {
		test("removes all subscribers for a type", () => {
			const bus = new EventBus();

			bus.subscribe("test:event", () => {});
			bus.subscribe("test:event", () => {});

			const removed = bus.unsubscribe("test:event");

			expect(removed).toBe(2);
			expect(bus.subscriberCount("test:event")).toBe(0);
		});

		test("returns 0 when type not found", () => {
			const bus = new EventBus();

			const removed = bus.unsubscribe("unknown:event");

			expect(removed).toBe(0);
		});

    test("only removes subscribers for specified type", () => {
      const bus = new EventBus();

      bus.subscribe("a", () => {});
      bus.subscribe("b", () => {});

      bus.unsubscribe("a");

      expect(bus.subscriberCount("a")).toBe(0);
      expect(bus.subscriberCount("b")).toBe(1);
    });

    test("unsubscribe keeps unrelated subscribers intact", () => {
      const bus = new EventBus();

      bus.subscribe("a", () => {});
      bus.subscribe("b", () => {});
      bus.subscribe("c", () => {});

      const removed = bus.unsubscribe("b");

      expect(removed).toBe(1);
      expect(bus.subscriberCount("a")).toBe(1);
      expect(bus.subscriberCount("b")).toBe(0);
      expect(bus.subscriberCount("c")).toBe(1);
    });
	});

  describe("Instance Methods", () => {
    describe("publish()", () => {
      test("calls matching subscribers", async () => {
        const bus = new EventBus();

        let called = false;

        bus.subscribe("test:event", () => {
          called = true;
        });

        await bus.publish(createEvent("test:event"));

        expect(called).toBe(true);
      });

      test("does not call non-matching subscribers", async () => {
        const bus = new EventBus();

        let called = false;

        bus.subscribe("other:event", () => {
          called = true;
        });

        await bus.publish(createEvent("test:event"));

        expect(called).toBe(false);
      });

      test("preserves subscriber execution order", async () => {
        const bus = new EventBus();

        const calls: number[] = [];

        bus.subscribe("test:event", () => void calls.push(1));
        bus.subscribe("test:event", () => void calls.push(2));

        await bus.publish(createEvent("test:event"));

        expect(calls).toEqual([1, 2]);
      });

      test("supports async subscribers and awaits them", async () => {
        const bus = new EventBus();

        let done = false;

        bus.subscribe("test:event", async () => {
          await wait();
          done = true;
        });

        await bus.publish(createEvent("test:event"));

        expect(done).toBe(true);
      });

      test("does nothing when no subscribers exist", async () => {
        const bus = new EventBus();

        expect(bus.publish(createEvent("no:listeners"))).resolves.toBeUndefined();
      });
    });

    describe("publishAll()", () => {
      test("publishes multiple events in order", async () => {
        const bus = new EventBus();

        const calls: string[] = [];

        bus.subscribe("a", () => void calls.push("a"));
        bus.subscribe("b", () => void calls.push("b"));

        await bus.publishAll([createEvent("a"), createEvent("b")]);

        expect(calls).toEqual(["a", "b"]);
      });

      test("continues even if one event fails", async () => {
        const bus = new EventBus();

        let called = false;

        bus.subscribe("a", () => {
          throw new Error("fail");
        });

        bus.subscribe("b", () => {
          called = true;
        });

        await expect(
          bus.publishAll([createEvent("a"), createEvent("b")]),
        ).rejects.toThrow();

        expect(called).toBe(true);
      });

      test("aggregates errors across events", async () => {
        const bus = new EventBus();

        bus.subscribe("a", () => {
          throw new Error("A");
        });

        bus.subscribe("b", () => {
          throw new Error("B");
        });

        try {
          await bus.publishAll([createEvent("a"), createEvent("b")]);
        } catch (err) {
          expect(err).toBeInstanceOf(AggregateError);

          const e = err as AggregateError;
          expect(e.errors.length).toBe(2);
        }
      });

      test("does nothing when events array is empty", async () => {
        const bus = new EventBus();

        expect(bus.publishAll([])).resolves.toBeUndefined();
      });

      test("handles async failure inside publishAll", async () => {
        const bus = new EventBus();

        bus.subscribe("a", async () => {
          throw new Error("A");
        });

        bus.subscribe("b", () => {});

        try {
          await bus.publishAll([createEvent("a"), createEvent("b")]);
        } catch (err) {
          expect(err).toBeInstanceOf(AggregateError);
        }
      });
    });
  })

	describe("Error handling", () => {
		test("continues executing subscribers even if one fails", async () => {
			const bus = new EventBus();

			let called = false;

			bus.subscribe("test:event", () => {
				throw new Error("fail");
			});

			bus.subscribe("test:event", () => {
				called = true;
			});

			await expect(bus.publish(createEvent("test:event"))).rejects.toThrow();

			expect(called).toBe(true);
		});

		test("throws AggregateError with all collected errors", async () => {
			const bus = new EventBus();

			bus.subscribe("test:event", () => {
				throw new Error("A");
			});

			bus.subscribe("test:event", () => {
				throw new Error("B");
			});

			try {
				await bus.publish(createEvent("test:event"));
			} catch (err) {
				expect(err).toBeInstanceOf(AggregateError);

				const e = err as AggregateError;
				expect(e.errors.length).toBe(2);
			}
		});
	});

	describe("Utilities", () => {
		test("subscriberCount returns correct value", () => {
			const bus = new EventBus();

			bus.subscribe("test:event", () => {});
			bus.subscribe("test:event", () => {});

			expect(bus.subscriberCount("test:event")).toBe(2);
		});

		test("clear removes all subscribers", () => {
			const bus = new EventBus();

			bus.subscribe("a", () => {});
			bus.subscribe("b", () => {});

			bus.clear();

			expect(bus.subscriberCount("a")).toBe(0);
			expect(bus.subscriberCount("b")).toBe(0);
		});
	});
});