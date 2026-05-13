/** biome-ignore-all lint/suspicious/noExplicitAny: TS cannot model private constructors with generic static factories. */
/** biome-ignore-all lint/complexity/noThisInStatic: Required for polymorphic `this` in base factory (DDD pattern). */

import { AutoMapper } from "../helpers/auto-mapper";
import { GettersAndSetters } from "../helpers/getters-setters";
import { DomainError } from "../libs/domain-error";
import { Result } from "../libs/result";
import type { Adapter, IAdapter } from "../types/adapter.types";
import type { IResult } from "../types/result.types";
import type { UID } from "../types/uid.types";
import type { AnyObject } from "../types/utils.types";
import type {
	IValueObjectSettings,
	ValueObjectConstructor,
} from "../types/value-object.types";
import { DeepFreeze, StableStringify } from "../utils/object.utils";

/**
 * @description
 * Represents a domain object characterized entirely by its properties rather than
 * a unique identifier. Two value objects with identical properties are considered equal.
 *
 * Value objects are immutable by design — mutations return new instances rather than
 * modifying the existing one. They encapsulate domain validation logic, ensuring that
 * only valid states can be represented.
 *
 * Extend this class to define your own value objects with custom business rules:
 * - Override `isValidProps()` to define what constitutes a valid state.
 * - Override `validation()` (inherited) to enforce per-key invariants on `set().to()`.
 * - Use `create()` as the sole public factory — keep constructors `private`.
 * - Use `init()` when you need a throwing factory (e.g., in seeding or tests).
 *
 * @template Props The shape of the value object's properties.
 *
 * @example
 * ```typescript
 * interface MoneyProps { amount: number }
 *
 * class Money extends ValueObject<MoneyProps> {
 *     private constructor(props: MoneyProps) { super(props); }
 *
 *     public static isValidProps({ amount }: MoneyProps): boolean {
 *         return amount >= 0;
 *     }
 *
 *     public static create(amount: number): IResult<Money> {
 *         if (!this.isValidProps({ amount })) return Result.error('Amount must be positive');
 *         return Result.success(new Money({ amount }));
 *     }
 * }
 * ```
 */
export abstract class ValueObject<Props> extends GettersAndSetters<Props> {
	/**
	 * @description
	 * Marker used internally by `Validator` to identify this instance as a `ValueObject`
	 * without requiring a direct `instanceof` check (avoiding circular imports).
	 *
	 * @internal
	 */
	protected readonly __kind = "ValueObject" as const;
	private readonly autoMapper: AutoMapper;

	/**
	 * @description
	 * Initializes a new `ValueObject` instance with the provided props and optional config.
	 *
	 * @param props The properties that define this value object's state.
	 * @param config Optional settings to disable getters or setters.
	 */
	constructor(props: Props, config?: IValueObjectSettings) {
		super(props, "ValueObject", { ...config, disableSetters: true });
		this.autoMapper = new AutoMapper();
	}

	/**
	 * @description
	 * Creates a deep clone of this value object, optionally overriding some properties.
	 *
	 * For object-based props, a shallow merge is performed before cloning — the result
	 * is always a new instance of the same subclass, not the base `ValueObject`.
	 *
	 * @param props Optional partial properties to override in the cloned instance.
	 * @returns A new instance of the same `ValueObject` subclass with the merged props.
	 *
	 * @example
	 * ```typescript
	 * const discounted = price.clone({ amount: price.get('amount') * 0.9 });
	 * ```
	 */
	public clone(props?: Props extends object ? Partial<Props> : never): this {
		const proto = Reflect.getPrototypeOf(this);
		const ctor = proto?.constructor ?? this.constructor;
		if (
			typeof this.props === "object" &&
			!(this.props instanceof Date) &&
			!Array.isArray(this.props)
		) {
			const merged = props ? { ...this.props, ...props } : { ...this.props };
			return Reflect.construct(ctor, [merged, this.config]);
		}
		return Reflect.construct(ctor, [this.props, this.config]);
	}

	/**
	 * @description
	 * Determines structural equality between this value object and another of the same type.
	 *
	 * Equality is determined by value, not reference. The comparison strategy varies by prop type:
	 * - Strings, booleans, numbers, bigints — compared by value.
	 * - Dates — compared by timestamp.
	 * - Arrays and functions — compared by JSON serialization.
	 * - IDs — compared by `.value()`.
	 * - Symbols — compared by `.description`.
	 * - Objects — compared by JSON serialization, excluding `createdAt` and `updatedAt`.
	 *
	 * @param other The value object to compare against.
	 * @returns `true` if both value objects are structurally equal; `false` otherwise.
	 */
	public isEqual(other: this): boolean {
		if (!other || other.__kind !== this.__kind) return false;
		const props = this.props;
		const otherProps = other?.props;

		const omitTimestamps = (obj: AnyObject): string => {
			if (!obj) return "";
			const { createdAt: _c, updatedAt: _u, ...rest } = obj;
			return StableStringify(rest);
		};

		if (this.validator.isArray(props) || this.validator.isFunction(props)) {
			return StableStringify(props) === StableStringify(otherProps);
		}

		if (this.validator.isBoolean(props)) return props === otherProps;

		if (this.validator.isDate(props)) {
			return (props as Date).getTime() === (otherProps as Date)?.getTime();
		}

		if (this.validator.isID(props)) {
			return (props as UID).value() === (otherProps as UID)?.value();
		}

		if (this.validator.isNull(props) || this.validator.isUndefined(props)) {
			return props === otherProps;
		}

		if (this.validator.isNumber(props) || typeof props === "bigint") {
			return this.validator
				.number(props as number)
				.isEqualTo(otherProps as number);
		}

		if (this.validator.isString(props)) {
			return this.validator
				.string(props as string)
				.isEqual(otherProps as string);
		}

		if (this.validator.isSymbol(props)) {
			return (
				(props as symbol).description === (otherProps as symbol)?.description
			);
		}

		return (
			omitTimestamps(props as AnyObject) ===
			omitTimestamps(otherProps as AnyObject)
		);
	}

	/**
	 * @description
	 * Serializes this value object into a plain, deeply frozen object.
	 *
	 * If an `adapter` is provided, the adapter's transformation is applied instead
	 * of the default `AutoMapper` serialization:
	 * - `Adapter` (with `adaptOne`) — synchronous transformation.
	 * - `IAdapter` (with `build`) — Result-wrapped transformation, value is unwrapped.
	 *
	 * The default output is a deeply frozen `unknown` — cast to your expected shape
	 * at the call site if needed.
	 *
	 * @param adapter Optional adapter to transform the output into a custom shape.
	 * @returns A deeply frozen serialized representation of this value object.
	 *
	 * @example
	 * ```typescript
	 * const plain = money.toObject();
	 * // { amount: 100 }
	 *
	 * const dto = money.toObject(new MoneyDtoAdapter());
	 * ```
	 */
	public toObject<T = Props>(
		adapter?: Adapter<this, T> | IAdapter<this, T>,
	): Readonly<T> {
		if (
			adapter &&
			typeof (adapter as Adapter<this, T>).adaptOne === "function"
		) {
			return (adapter as Adapter<this, T>).adaptOne(this);
		}
		if (adapter && typeof (adapter as IAdapter<this, T>).build === "function") {
			return (adapter as IAdapter<this, T>).build(this).value();
		}

		const mapped = this.autoMapper.valueObjectToObj(this);
		if (typeof mapped === "object" && mapped !== null) {
			return DeepFreeze(mapped) as Readonly<T>;
		}

		return mapped as Readonly<T>;
	}

	/**
	 * @description
	 * Creates a new `ValueObject` instance wrapped in a `Result`.
	 *
	 * Returns `Result.error()` if `isValidProps()` returns `false`.
	 * Subclasses should override both this method and `isValidProps()` to enforce
	 * domain-specific construction rules.
	 *
	 * @param props The properties to validate and construct the value object with.
	 * @returns A `Result` containing the new instance on success, or an error on failure.
	 *
	 * @example
	 * ```typescript
	 * const result = Money.create(100);
	 * if (result.isSuccess()) {
	 *     const money = result.value();
	 * }
	 * ```
	 */
	public static create<Props, T extends ValueObject<Props>>(
		this: ValueObjectConstructor<Props, T>,
		props: Props,
	): IResult<T> {
		if (!this.isValidProps(props)) {
			return Result.error(
				`Invalid props for ${this.name}: failed domain validation.`,
			);
		}

		const instance = new (this as any)(props);
		return Result.success(instance);
	}

	/**
	 * @description
	 * Initializes a new `ValueObject` instance directly, throwing a `DomainError` if
	 * the provided props are invalid.
	 *
	 * Prefer `create()` for production code. Use `init()` in tests, seeders, or contexts
	 * where you can guarantee the props are valid and prefer exceptions over `Result`.
	 *
	 * @param props The properties to validate and construct the value object with.
	 * @returns A new instance of this value object subclass.
	 * @throws {DomainError} If `isValidProps()` returns `false`.
	 */
	public static init<Props, T extends ValueObject<Props>>(
		this: ValueObjectConstructor<Props, T>,
		props: Props,
	): T {
		if (!this.isValidProps(props)) {
			throw new DomainError(`Init: invalid props.`, { context: this.name });
		}

		const instance = new (this as any)(props);
		return instance;
	}

	/**
	 * @description
	 * Alias for `isValidProps()`. Provided for consistency with the `Entity` API.
	 * Subclasses should override `isValidProps()` rather than this method.
	 *
	 * @param value The value to validate.
	 * @returns `true` if valid; `false` otherwise.
	 */
	public static isValid(value: unknown): boolean {
		return this.isValidProps(value) === undefined;
	}

	/**
	 * @description
	 * Validates the provided props before constructing a new instance.
	 *
	 * The base implementation accepts anything that is not `null` or `undefined`.
	 * Override this in your subclass to enforce domain-specific rules.
	 *
	 * @param props The props to validate.
	 * @returns `true` if the props represent a valid state; `false` otherwise.
	 *
	 * @example
	 * ```typescript
	 * public static isValidProps({ amount }: MoneyProps): boolean {
	 *     return amount >= 0;
	 * }
	 * ```
	 */
	public static isValidProps(props: unknown): DomainError | undefined {
		if (
			!ValueObject.validator.isUndefined(props) &&
			!ValueObject.validator.isNull(props)
		) {
			return new DomainError("props must not be null or undefined");
		}
	}
}
