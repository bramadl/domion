/**
 * @description
 * Core contract for the Specification pattern.
 *
 * A specification encapsulates a single named business rule that can be evaluated
 * against a candidate object. The rule is reusable, composable, and lives in the
 * domain layer — not scattered across use cases or services.
 *
 * @template T The type of the candidate being evaluated.
 */
export interface ISpecification<T> {
	/**
	 * @description
	 * Evaluates whether the candidate satisfies this specification.
	 *
	 * @param candidate The domain object to evaluate.
	 * @returns `true` if satisfied; `false` otherwise.
	 */
	isSatisfiedBy(candidate: T): boolean;

	/**
	 * @description
	 * Returns a new specification that is satisfied only when **both** this and
	 * the provided specification are satisfied (logical AND).
	 *
	 * @param other The specification to AND with.
	 */
	and(other: ISpecification<T>): ISpecification<T>;

	/**
	 * @description
	 * Returns a new specification that is satisfied when **either** this or the
	 * provided specification is satisfied (logical OR).
	 *
	 * @param other The specification to OR with.
	 */
	or(other: ISpecification<T>): ISpecification<T>;

	/**
	 * @description
	 * Returns a new specification that is satisfied when this specification is
	 * **not** satisfied (logical NOT).
	 */
	not(): ISpecification<T>;
}
