import type { ISpecification } from "../types/specification.types";

/**
 * @description
 * Abstract base class for all domain specifications.
 *
 * A `Specification` is a pure predicate — it answers one question: does this
 * candidate satisfy the rule? Nothing more. Error messaging and failure context
 * are concerns of the caller (domain method, application layer) via `DomainError`.
 *
 * Specifications are:
 * - **Named** — each subclass carries a meaningful ubiquitous-language name.
 * - **Composable** — combine via `.and()`, `.or()`, `.not()` without subclassing.
 * - **Pure** — no side effects, no I/O, no error state.
 *
 * **Three use cases (Evans):**
 * 1. **Validation** — guard Aggregate domain methods against invalid state transitions.
 * 2. **In-memory selection** — filter already-loaded collections.
 * 3. **Construction criteria** — express what a valid object must look like.
 *
 * Specifications are **not** intended to drive persistence queries. Repository
 * methods should use explicit parameters and delegate to the ORM/query builder
 * directly — translating specs to SQL couples domain rules to infrastructure.
 *
 * **Implementing a specification**
 *
 * Extend `BaseSpecification<T>` and implement the `protected satisfiedBy()` method.
 * Never override `isSatisfiedBy` — the base class owns that method.
 *
 * @template T The type of the candidate being evaluated.
 *
 * @example
 * ```typescript
 * // 1. Define
 * class MinimumOrderAmountSpec extends BaseSpecification<Order> {
 *     constructor(private readonly minimum: number) { super(); }
 *
 *     protected satisfiedBy(order: Order): boolean {
 *         return order.get('total') >= this.minimum;
 *     }
 * }
 *
 * // 2. Compose
 * const eligible = new MinimumOrderAmountSpec(100)
 *     .and(new IsPaidSpec())
 *     .and(new IsFraudSpec().not());
 *
 * // 3. Guard inside an Aggregate domain method
 * ship(): void {
 *     if (!new MinimumOrderAmountSpec(100).and(new IsPaidSpec()).isSatisfiedBy(this)) {
 *         throw new DomainError('Order is not eligible for shipping', { context: 'Order' });
 *     }
 *     this.change('status', 'shipped');
 *     this.emit({ type: 'order:shipped' });
 * }
 *
 * // 4. In-memory selection
 * const eligibleOrders = orders.filter(o => eligible.isSatisfiedBy(o));
 * ```
 */
export abstract class BaseSpecification<T> implements ISpecification<T> {
	/**
	 * @description
	 * Marker used by `Validator.isSpecification()` to identify this instance
	 * without an `instanceof` check (avoids circular imports).
	 * @internal
	 */
	protected readonly __kind = "Specification" as const;

	/**
	 * @description
	 * Implement the business rule here.
	 *
	 * Called internally by `isSatisfiedBy`. Do **not** call this method directly.
	 *
	 * @param candidate The domain object to evaluate.
	 * @returns `true` if the candidate satisfies the rule; `false` otherwise.
	 */
	protected abstract satisfiedBy(candidate: T): boolean;

	/**
	 * @description
	 * Evaluates whether the candidate satisfies this specification.
	 *
	 * Delegates to `satisfiedBy()` — do not override this method in subclasses.
	 *
	 * @param candidate The domain object to evaluate.
	 * @returns `true` if satisfied; `false` otherwise.
	 */
	public isSatisfiedBy(candidate: T): boolean {
		return this.satisfiedBy(candidate);
	}

	/**
	 * @description
	 * Returns a new specification satisfied only when **both** this and `other`
	 * are satisfied (logical AND).
	 *
	 * @example
	 * ```typescript
	 * const spec = new MinimumAmountSpec(100).and(new IsPaidSpec());
	 * ```
	 */
	public and(other: ISpecification<T>): ISpecification<T> {
		return new AndSpecification(this, other as BaseSpecification<T>);
	}

	/**
	 * @description
	 * Returns a new specification satisfied when **either** this or `other`
	 * is satisfied (logical OR).
	 *
	 * @example
	 * ```typescript
	 * const spec = new IsVipSpec().or(new HasCouponSpec());
	 * ```
	 */
	public or(other: ISpecification<T>): ISpecification<T> {
		return new OrSpecification(this, other as BaseSpecification<T>);
	}

	/**
	 * @description
	 * Returns a new specification satisfied when this specification is **not**
	 * satisfied (logical NOT).
	 *
	 * @example
	 * ```typescript
	 * const spec = new IsFraudSpec().not();
	 * ```
	 */
	public not(): ISpecification<T> {
		return new NotSpecification(this);
	}
}

// ─── Composite Implementations ───────────────────────────────────────────────

/** @internal */
class AndSpecification<T> extends BaseSpecification<T> {
	constructor(
		private readonly left: BaseSpecification<T>,
		private readonly right: BaseSpecification<T>,
	) {
		super();
	}

	protected satisfiedBy(candidate: T): boolean {
		return (
			this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate)
		);
	}
}

/** @internal */
class OrSpecification<T> extends BaseSpecification<T> {
	constructor(
		private readonly left: BaseSpecification<T>,
		private readonly right: BaseSpecification<T>,
	) {
		super();
	}

	protected satisfiedBy(candidate: T): boolean {
		return (
			this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate)
		);
	}
}

/** @internal */
class NotSpecification<T> extends BaseSpecification<T> {
	constructor(private readonly wrapped: BaseSpecification<T>) {
		super();
	}

	protected satisfiedBy(candidate: T): boolean {
		return !this.wrapped.isSatisfiedBy(candidate);
	}
}
