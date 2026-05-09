import { describe, expect, test } from "bun:test";

import { BaseSpecification } from "../../../src/kernel";

// ─── Test Doubles ─────────────────────────────────────────────────────────────

interface Order {
	total: number;
	isPaid: boolean;
	isFraud: boolean;
}

class MinimumAmountSpec extends BaseSpecification<Order> {
	constructor(private readonly minimum: number) {
		super();
	}

	protected satisfiedBy(order: Order): boolean {
		return order.total >= this.minimum;
	}
}

class IsPaidSpec extends BaseSpecification<Order> {
	protected satisfiedBy(order: Order): boolean {
		return order.isPaid === true;
	}
}

class IsFraudSpec extends BaseSpecification<Order> {
	protected satisfiedBy(order: Order): boolean {
		return order.isFraud === true;
	}
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const validOrder: Order    = { total: 200, isPaid: true,  isFraud: false };
const lowAmountOrder: Order = { total: 50,  isPaid: true,  isFraud: false };
const unpaidOrder: Order   = { total: 200, isPaid: false, isFraud: false };
const fraudOrder: Order    = { total: 200, isPaid: true,  isFraud: true  };

// ─── Suites ───────────────────────────────────────────────────────────────────

describe("[Core] BaseSpecification", () => {
	describe("isSatisfiedBy()", () => {
		test("returns true when the candidate satisfies the rule", () => {
			const spec = new MinimumAmountSpec(100);

			expect(spec.isSatisfiedBy(validOrder)).toBe(true);
		});

		test("returns false when the candidate does not satisfy the rule", () => {
			const spec = new MinimumAmountSpec(100);

			expect(spec.isSatisfiedBy(lowAmountOrder)).toBe(false);
		});

		test("is stateless — re-evaluates correctly on every call", () => {
			const spec = new MinimumAmountSpec(100);

			expect(spec.isSatisfiedBy(validOrder)).toBe(true);
			expect(spec.isSatisfiedBy(lowAmountOrder)).toBe(false);
			expect(spec.isSatisfiedBy(validOrder)).toBe(true);
		});
	});

	describe("Composition — .and()", () => {
		test("returns true only when both specs are satisfied", () => {
			const spec = new MinimumAmountSpec(100).and(new IsPaidSpec());

			expect(spec.isSatisfiedBy(validOrder)).toBe(true);
		});

		test("returns false when the left spec fails", () => {
			const spec = new MinimumAmountSpec(100).and(new IsPaidSpec());

			expect(spec.isSatisfiedBy(lowAmountOrder)).toBe(false);
		});

		test("returns false when the right spec fails", () => {
			const spec = new MinimumAmountSpec(100).and(new IsPaidSpec());

			expect(spec.isSatisfiedBy(unpaidOrder)).toBe(false);
		});

		test("returns false when both specs fail", () => {
			const spec = new MinimumAmountSpec(100).and(new IsPaidSpec());

			expect(spec.isSatisfiedBy({ total: 50, isPaid: false, isFraud: false })).toBe(false);
		});

		test("chains multiple .and() calls correctly", () => {
			const spec = new MinimumAmountSpec(100)
				.and(new IsPaidSpec())
				.and(new IsFraudSpec().not());

			expect(spec.isSatisfiedBy(validOrder)).toBe(true);
			expect(spec.isSatisfiedBy(fraudOrder)).toBe(false);
		});
	});

	describe("Composition — .or()", () => {
		test("returns true when only the left spec is satisfied", () => {
			const spec = new MinimumAmountSpec(100).or(new IsPaidSpec());

			expect(spec.isSatisfiedBy({ total: 200, isPaid: false, isFraud: false })).toBe(true);
		});

		test("returns true when only the right spec is satisfied", () => {
			const spec = new MinimumAmountSpec(100).or(new IsPaidSpec());

			expect(spec.isSatisfiedBy({ total: 50, isPaid: true, isFraud: false })).toBe(true);
		});

		test("returns true when both specs are satisfied", () => {
			const spec = new MinimumAmountSpec(100).or(new IsPaidSpec());

			expect(spec.isSatisfiedBy(validOrder)).toBe(true);
		});

		test("returns false when both specs fail", () => {
			const spec = new MinimumAmountSpec(100).or(new IsPaidSpec());

			expect(spec.isSatisfiedBy({ total: 50, isPaid: false, isFraud: false })).toBe(false);
		});
	});

	describe("Composition — .not()", () => {
		test("returns true when the wrapped spec is not satisfied", () => {
			const spec = new IsFraudSpec().not();

			expect(spec.isSatisfiedBy(validOrder)).toBe(true);
		});

		test("returns false when the wrapped spec is satisfied", () => {
			const spec = new IsFraudSpec().not();

			expect(spec.isSatisfiedBy(fraudOrder)).toBe(false);
		});

		test("double negation restores the original behavior", () => {
			const spec = new IsFraudSpec().not().not();

			expect(spec.isSatisfiedBy(fraudOrder)).toBe(true);
			expect(spec.isSatisfiedBy(validOrder)).toBe(false);
		});
	});

	describe("Composition — nested / mixed", () => {
		test("AND then NOT — satisfied when the AND composite is false", () => {
			const spec = new MinimumAmountSpec(100).and(new IsPaidSpec()).not();

			expect(spec.isSatisfiedBy(lowAmountOrder)).toBe(true);
			expect(spec.isSatisfiedBy(validOrder)).toBe(false);
		});

		test("NOT then AND — composes correctly regardless of operator order", () => {
			const spec = new IsFraudSpec().not().and(new IsPaidSpec());

			expect(spec.isSatisfiedBy(validOrder)).toBe(true);
			expect(spec.isSatisfiedBy(fraudOrder)).toBe(false);
			expect(spec.isSatisfiedBy(unpaidOrder)).toBe(false);
		});

		test("in-memory collection filter — returns only satisfying candidates", () => {
			const orders: Order[] = [
				{ total: 200, isPaid: true,  isFraud: false },
				{ total: 50,  isPaid: true,  isFraud: false },
				{ total: 200, isPaid: false, isFraud: false },
				{ total: 200, isPaid: true,  isFraud: true  },
			];

			const spec = new MinimumAmountSpec(100)
				.and(new IsPaidSpec())
				.and(new IsFraudSpec().not());

			const result = orders.filter((o) => spec.isSatisfiedBy(o));

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ total: 200, isPaid: true, isFraud: false });
		});

		test("same spec instance can be reused across multiple candidates without interference", () => {
			const spec = new MinimumAmountSpec(100)
				.and(new IsPaidSpec())
				.and(new IsFraudSpec().not());

			expect(spec.isSatisfiedBy(validOrder)).toBe(true);
			expect(spec.isSatisfiedBy(lowAmountOrder)).toBe(false);
			expect(spec.isSatisfiedBy(unpaidOrder)).toBe(false);
			expect(spec.isSatisfiedBy(fraudOrder)).toBe(false);
			expect(spec.isSatisfiedBy(validOrder)).toBe(true);
		});
	});
});
