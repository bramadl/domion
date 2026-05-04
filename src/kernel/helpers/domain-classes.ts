import { Iterator } from "../libs/iterator";
import { Result } from "../libs/result";
import type { IIterator } from "../types/iterator.types";
import type { IResult } from "../types/result.types";

/**
 * @description
 * Represents the result of a `DomainClasseses.createMany()` operation.
 *
 * Contains both an iterator over each individual creation result and a combined
 * result that reflects the overall success or failure of the batch operation.
 */
export interface CreateManyResult {
	/**
	 * @description
	 * An iterator over each individual `Result` produced during the batch creation.
	 * Use `data.next()` to access results in the same order as the input entries.
	 */
	data: IIterator<IResult<unknown, unknown, unknown>>;

	/**
	 * @description
	 * A combined `Result` representing the overall outcome.
	 * Will be a failure if any single entry failed to be created.
	 */
	result: IResult<unknown, unknown, unknown>;
}

/**
 * @description
 * Represents a pairing of a domain class and the props needed to construct an instance of it.
 * Used internally by the `DomainClasses` fluent builder.
 */
interface DomainClassesEntry {
	class: {
		create: (props: unknown) => IResult<unknown, unknown, unknown>;
		name: string;
	};
	props: unknown;
}

/**
 * @description
 * Fluent builder for creating multiple domain instances in a single batch operation.
 *
 * Chain `.prepare()` calls to register domain classes and their props,
 * then call `.create()` to execute all instantiations at once.
 *
 * The combined `result` reflects the overall success or failure of the batch —
 * it fails if any single entry fails. Individual results are accessible via the
 * returned `data` iterator in the same order as the `.prepare()` calls.
 *
 * @example
 * ```typescript
 * const { result, data } = DomainClasses
 *     .prepare(Age, { value: 21 })
 *     .prepare(Name, { value: 'Alice' })
 *     .create();
 *
 * if (result.isSuccess()) {
 *     const age = data.next().value() as Age;
 *     const name = data.next().value() as Name;
 * }
 * ```
 */
export class DomainClasses {
	private readonly entries: DomainClassesEntry[] = [];

	private constructor() {}

	/**
	 * @description
	 * Registers a domain class and its construction props for batch instantiation.
	 *
	 * Returns the same `DomainClasses` builder instance to allow chaining.
	 *
	 * @param domainClasses The domain class with a static `create` method.
	 * @param props The props to pass to the class's `create` method.
	 * @returns The current `DomainClasses` builder instance.
	 *
	 * @example
	 * ```typescript
	 * DomainClasses.prepare(Money, { amount: 100 })
	 * ```
	 */
	public prepare<Props>(
		domainClasses: DomainClassesEntry["class"],
		props: Props,
	): this {
		this.entries.push({ class: domainClasses, props });
		return this;
	}

	/**
	 * @description
	 * Executes the batch creation of all registered domain class entries.
	 *
	 * Iterates over each registered entry and calls its class's static `create` method.
	 * If an entry's class does not expose a `create` method, a failure `Result` is
	 * recorded for that entry.
	 *
	 * @returns A `CreateManyResult` containing:
	 * - `result`: A combined `IResult` — fails if any entry failed.
	 * - `data`: An `IIterator` over each individual `IResult`, in registration order.
	 *
	 * @example
	 * ```typescript
	 * const { result, data } = DomainClasses
	 *     .prepare(Age, { value: 21 })
	 *     .prepare(Name, { value: 'Alice' })
	 *     .create();
	 * ```
	 */
	public create(): CreateManyResult {
		const results: IResult<unknown, unknown, unknown>[] = [];

		for (const entry of this.entries) {
			if (typeof entry.class?.create !== "function") {
				results.push(
					Result.error(
						`No static 'create' method found in class ${entry.class?.name}.`,
					),
				);
				continue;
			}
			results.push(entry.class.create(entry.props));
		}

		const iterator = Iterator.create({
			initialData: results,
			returnCurrentOnReversion: true,
		});

		return {
			data: iterator,
			result: Result.combine(results),
		};
	}

	/**
	 * @description
	 * Entry point for the `DomainClasses` fluent builder.
	 *
	 * Equivalent to `new DomainClasses().prepare(domainClasses, props)` — starts a new
	 * builder chain with the first class-props pair already registered.
	 *
	 * @param domainClasses The domain class with a static `create` method.
	 * @param props The props to pass to the class's `create` method.
	 * @returns A new `DomainClasses` builder instance with the first entry registered.
	 *
	 * @example
	 * ```typescript
	 * DomainClasses.prepare(Age, { value: 21 }).prepare(Name, { value: 'Alice' }).create()
	 * ```
	 */
	public static prepare<Props>(
		domainClasses: DomainClassesEntry["class"],
		props: Props,
	): DomainClasses {
		return new DomainClasses().prepare(domainClasses, props);
	}
}
