/** biome-ignore-all lint/suspicious/noExplicitAny: TS cannot model private constructors with generic static factories. */
/** biome-ignore-all lint/complexity/noThisInStatic: Required for polymorphic `this` in base factory (DDD pattern). */

import { AutoMapper } from "../helpers/auto-mapper";
import { GettersAndSetters } from "../helpers/getters-setters";
import { DomainError } from "../libs/domain-error";
import { Result } from "../libs/result";
import type { Adapter, IAdapter } from "../types/adapter.types";
import type {
	EntityConstructor,
	EntityProps,
	IEntityProps,
	IEntitySettings,
} from "../types/entity.types";
import type { IResult } from "../types/result.types";
import type { UID } from "../types/uid.types";
import type { AnyObject } from "../types/utils.types";
import { DeepFreeze, StableStringify } from "../utils/object.utils";
import { InvalidPropsType } from "../utils/type.utils";
import { ID } from "./id";

/**
 * @description
 * Represents a domain entity — a domain object with a stable unique identity.
 *
 * Unlike value objects, two entities are not equal simply because their properties match.
 * Identity is determined by the `id` field. Two entities are equal only when they share
 * the same `id` AND belong to the same class AND share the same property values
 * (excluding lifecycle timestamps).
 *
 * Entities automatically track `createdAt` and `updatedAt` timestamps. Mutations via
 * `set().to()` or `change()` automatically refresh `updatedAt`.
 *
 * Extend this class to define your own entities with custom business rules:
 * - Override `isValidProps()` to define construction constraints.
 * - Override `validation()` (inherited) to enforce per-key invariants.
 * - Use `create()` as the sole public factory — keep constructors `private`.
 * - Use `init()` when you need a throwing factory (e.g., in tests or seeders).
 *
 * @template Props The shape of the entity's user-defined domain properties.
 *   Do **not** include `id`, `createdAt`, or `updatedAt` here — they are added
 *   automatically via `EntityProps<Props>` in the factory methods.
 *
 * @example
 * ```typescript
 * interface UserProps { name: string; email: string; }
 *
 * class User extends Entity<UserProps> {
 *     private constructor(props: EntityProps<UserProps>) { super(props); }
 *
 *     public static override isValidProps(props: unknown): boolean {
 *         return (
 *             this.validator.isObject(props) &&
 *             'name' in props && this.validator.isString(props.name) &&
 *             'email' in props && this.validator.isString(props.email)
 *         );
 *     }
 * }
 *
 * // Autocomplete: name, email, id?, createdAt?, updatedAt?
 * const result = User.create({ name: 'Alice', email: 'alice@example.com' });
 * // get() autocomplete: 'name' | 'email' | 'id' | 'createdAt' | 'updatedAt'
 * result.value().get('name');
 * ```
 */
export abstract class Entity<
	Props extends IEntityProps,
> extends GettersAndSetters<EntityProps<Props>> {
	/**
	 * @description
	 * Marker used internally by `Validator` to identify this instance as an `Entity`
	 * without requiring a direct `instanceof` check (avoiding circular imports).
	 *
	 * @internal
	 */
	protected readonly __kind = "Entity" as const;
	private readonly autoMapper: AutoMapper;
	private _id: UID<string>;

	/**
	 * @description
	 * Initializes a new `Entity` instance.
	 *
	 * Props are merged with default `createdAt` and `updatedAt` timestamps.
	 * The `id` field is resolved from props if present (as string, number, or UID),
	 * or a new UUID is generated automatically.
	 *
	 * @param props The domain properties for this entity, including optional implicit fields.
	 * @param config Optional settings to disable getters or setters.
	 *
	 * @throws {DomainError} If `props` is not a plain object.
	 */
	constructor(props: Props, config?: IEntitySettings) {
		if (!Entity.isPlainProps(props)) {
			const name = new.target.name;
			throw new DomainError(
				`Construct: props must be a plain object (received: ${InvalidPropsType(props)}).`,
				{ context: name },
			);
		}

		const merged = Object.assign(
			{},
			{ createdAt: new Date(), updatedAt: new Date() },
			props,
		) as Props;

		super(merged, "Entity", config);
		this.autoMapper = new AutoMapper();

		const rawId = (props as AnyObject).id;
		const isUID = this.validator.isID(rawId);
		const isStringOrNumber =
			this.validator.isString(rawId) || this.validator.isNumber(rawId);

		this._id = isStringOrNumber
			? ID.create(rawId as string | number)
			: isUID
				? (rawId as UID<string>)
				: ID.create();
	}

	/**
	 * @description
	 * Creates a deep clone of this entity, optionally overriding some properties.
	 *
	 * If `props` contains an `id`, it is used as the clone's identity.
	 * Otherwise, the clone inherits the original entity's `id`.
	 *
	 * @param props Optional partial properties to override in the cloned instance.
	 * @returns A new instance of the same `Entity` subclass.
	 */
	public clone(props?: Partial<Props>): this {
		const proto = Reflect.getPrototypeOf(this);
		const ctor = proto?.constructor ?? this.constructor;
		const merged = props ? { ...this.props, ...props } : { ...this.props };
		return Reflect.construct(ctor, [merged, this.config]);
	}

	/**
	 * @description
	 * Generates a hash code identifier for this entity combining its class name and ID.
	 * Useful for logging, caching, or deduplication.
	 *
	 * Format: `[Entity@ClassName]:UUID`
	 *
	 * @returns A `UID<string>` representing this entity's hash code.
	 */
	public hashCode(): UID<string> {
		const proto = Reflect.getPrototypeOf(this);
		const name = proto?.constructor?.name ?? "Entity";
		return ID.create(`[Entity@${name}]:${this._id.value()}`);
	}

	/**
	 * @description
	 * The unique identifier of this entity.
	 */
	public get id(): UID<string> {
		return this._id;
	}

	/**
	 * @description
	 * Determines structural and identity equality between this entity and another.
	 *
	 * Two entities are considered equal when **all three** conditions hold:
	 * 1. They are instances of the same concrete class (same `constructor`).
	 * 2. Their `id` values are equal.
	 * 3. Their domain properties (excluding `id`, `createdAt`, `updatedAt`) are deeply equal.
	 *
	 * **Why class-identity check matters (critical DDD rule):**
	 * Without the constructor guard, a `User` entity and an `Admin` entity that happen
	 * to share the same `id` (e.g. when restored from the same DB row) would be
	 * considered equal — a silent, hard-to-trace bug. In DDD, entity identity is
	 * scoped to its aggregate boundary and class type.
	 *
	 * @param other The entity to compare against.
	 * @returns `true` if both entities are fully equal; `false` otherwise.
	 */
	public isEqual(other: this): boolean {
		if (
			!other ||
			Reflect.getPrototypeOf(this)?.constructor !==
				Reflect.getPrototypeOf(other)?.constructor
		) {
			return false;
		}

		const omit = (obj: AnyObject) => {
			const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = obj;
			return rest;
		};

		const currentProps = omit(this.props as AnyObject);
		const otherProps = omit((other?.props ?? {}) as AnyObject);

		return (
			this._id.isEqual(other?.id) &&
			StableStringify(currentProps) === StableStringify(otherProps)
		);
	}

	/**
	 * @description
	 * Returns `true` if this entity's ID was freshly generated (not restored from persistence).
	 */
	public isNew(): boolean {
		return this._id.isNew();
	}

	/**
	 * @description
	 * Serializes this entity into a plain, deeply frozen object.
	 *
	 * If an `adapter` is provided, the adapter's transformation is applied instead
	 * of the default `AutoMapper` serialization.
	 *
	 * @param adapter Optional adapter to transform the output into a custom shape.
	 * @returns A deeply frozen serialized representation of this entity.
	 *
	 * @example
	 * ```typescript
	 * const plain = user.toObject();
	 * // { id: '...', name: 'Alice', createdAt: Date, updatedAt: Date }
	 *
	 * const dto = user.toObject(new UserDtoAdapter());
	 * ```
	 */
	public toObject<T>(
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
		return DeepFreeze(
			this.autoMapper.entityToObj(this) as object,
		) as Readonly<T>;
	}

	/**
	 * @description
	 * Creates a new `Entity` instance wrapped in a `Result`.
	 *
	 * The `this: EntityConstructor<Props, T>` typing mirrors the pattern used by
	 * `ValueObject.create()`, ensuring that when called on a concrete subclass,
	 * TypeScript infers the correct `Props` and instance type `T` automatically —
	 * so subclasses do **not** need to override `create()` just for types.
	 *
	 * Returns `Result.error()` if `isValidProps()` returns `false`.
	 *
	 * @param props The properties to validate and construct the entity with.
	 *   Includes both user-defined domain props and optional implicit fields
	 *   (`id`, `createdAt`, `updatedAt`).
	 * @returns A `Result` containing the new instance on success, or an error on failure.
	 *
	 * @example
	 * ```typescript
	 * // No override needed — types are inferred from EntityConstructor<UserProps, User>
	 * const result = User.create({ name: 'Alice', email: 'alice@example.com' });
	 * //                                            ^^ autocomplete works here
	 * if (result.isSuccess()) {
	 *     result.value().get('name'); // 'Alice' — autocomplete works here too
	 * }
	 * ```
	 */
	public static create<Props extends object, T extends Entity<Props>>(
		this: EntityConstructor<Props, T>,
		props: EntityProps<Props>,
	): IResult<T, string> {
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
	 * Initializes a new `Entity` instance directly, throwing a `DomainError` if
	 * the provided props are invalid.
	 *
	 * Prefer `create()` for production code. Use `init()` in tests, seeders, or contexts
	 * where you can guarantee the props are valid and prefer exceptions over `Result`.
	 *
	 * Subclasses do **not** need to override this — types are inferred from
	 * `EntityConstructor<Props, T>` the same way as `create()`.
	 *
	 * @param props The properties to validate and construct the entity with.
	 * @returns A new instance of this entity subclass.
	 * @throws {DomainError} If `isValidProps()` returns `false`.
	 *
	 * @example
	 * ```typescript
	 * // In tests or seeders where you want to throw on invalid data:
	 * const user = User.init({ name: 'Alice', email: 'alice@example.com' });
	 * ```
	 */
	public static init<Props extends object, T extends Entity<Props>>(
		this: EntityConstructor<Props, T>,
		props: EntityProps<Props>,
	): T {
		if (!this.isValidProps(props)) {
			throw new DomainError(`Init: invalid props.`, { context: this.name });
		}

		const instance = new (this as any)(props);
		return instance;
	}

	/**
	 * @description Alias for `isValidProps()`.
	 */
	public static isValid(value: unknown): boolean {
		return this.isValidProps(value);
	}

	/**
	 * @description
	 * Validates the provided props before constructing a new instance.
	 * Base implementation rejects `null` and `undefined`.
	 * Override in subclasses to enforce domain-specific rules.
	 *
	 * @param props The props to validate.
	 * @returns `true` if valid; `false` otherwise.
	 */
	public static isValidProps(props: unknown): boolean {
		return (
			!Entity.validator.isUndefined(props) && !Entity.validator.isNull(props)
		);
	}

	private static isPlainProps(props: unknown): props is AnyObject {
		if (props === null || typeof props !== "object") return false;
		if (props instanceof Date || Array.isArray(props)) return false;
		const proto = Object.getPrototypeOf(props);
		return proto === Object.prototype || proto === null;
	}
}
