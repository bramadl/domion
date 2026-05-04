import { AutoMapper } from "../helpers/auto-mapper";
import { DomainError } from "../helpers/domain-error";
import { GettersAndSetters } from "../helpers/getters-setters";
import { Result } from "../libs/result";
import type { Adapter, IAdapter } from "../types/adapter.types";
import type { IEntityProps, IEntitySettings } from "../types/entity.types";
import type { IResult } from "../types/result.types";
import type { UID } from "../types/uid.types";
import type { AnyObject } from "../types/utils.types";
import { DeepFreeze, StableStringify } from "../utils/object.utils";
import { ID } from "./id";

/**
 * @description
 * Represents a domain entity — a domain object with a stable unique identity.
 *
 * Unlike value objects, two entities are not equal simply because their properties match.
 * Identity is determined by the `id` field. Two entities are equal only when they share
 * the same `id` AND the same property values (excluding lifecycle timestamps).
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
 * @template Props The shape of the entity's domain properties.
 *
 * @example
 * ```typescript
 * interface UserProps { name: string; email: string; }
 *
 * class User extends Entity<UserProps> {
 *     private constructor(props: UserProps) { super(props); }
 *
 *     public static create(props: UserProps): IResult<User> {
 *         if (!this.isValidProps(props)) return Result.error('Invalid props');
 *         return Result.success(new User(props));
 *     }
 * }
 * ```
 */
export class Entity<
	Props extends IEntityProps,
> extends GettersAndSetters<Props> {
	/**
	 * @description
	 * Marker used internally by `Validator` to identify this instance as an `Entity`
	 * without requiring a direct `instanceof` check (avoiding circular imports).
	 *
	 * @internal
	 */
	protected readonly __kind = "Entity" as const;

	/**
	 * @description
	 * Internal mapper used to serialize this entity into a plain object via `toObject()`.
	 *
	 * @internal
	 */
	private readonly autoMapper: AutoMapper;

	/**
	 * @description
	 * The unique identifier of this entity instance.
	 */
	protected _id: UID<string>;

	/**
	 * @description
	 * Initializes a new `Entity` instance.
	 *
	 * Props are merged with default `createdAt` and `updatedAt` timestamps.
	 * The `id` field is resolved from props if present (as string, number, or UID),
	 * or a new UUID is generated automatically.
	 *
	 * @param props The domain properties for this entity.
	 * @param config Optional settings to disable getters or setters.
	 *
	 * @throws {DomainError} If `props` is not a plain object.
	 */
	constructor(props: Props, config?: IEntitySettings) {
		if (!Entity.isPlainProps(props)) {
			const name = new.target.name;
			throw new DomainError(
				`Props must be a plain object for entities. Received: "${typeof props}" in "${name}".`,
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

		const rawId = (props as Record<string, unknown>).id;
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
	 * Determines structural and identity equality between this entity and another of the same type.
	 *
	 * Two entities are equal when:
	 * - Their `id` values are equal, AND
	 * - Their properties (excluding `id`, `createdAt`, `updatedAt`) are deeply equal.
	 *
	 * @param other The entity to compare against.
	 * @returns `true` if both entities are equal; `false` otherwise.
	 */
	public isEqual(other: this): boolean {
		const omit = (obj: Record<string, unknown>) => {
			const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = obj;
			return rest;
		};

		const currentProps = omit(this.props as Record<string, unknown>);
		const otherProps = omit((other?.props ?? {}) as Record<string, unknown>);

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
	 * ```
	 */
	public toObject<T>(adapter?: Adapter<this, T> | IAdapter<this, T>): unknown {
		if (
			adapter &&
			typeof (adapter as Adapter<this, T>).adaptOne === "function"
		) {
			return (adapter as Adapter<this, T>).adaptOne(this);
		}
		if (adapter && typeof (adapter as IAdapter<this, T>).build === "function") {
			return (adapter as IAdapter<this, T>).build(this).value();
		}
		return DeepFreeze(this.autoMapper.entityToObj(this) as object);
	}

	/**
	 * @description
	 * Creates a new `Entity` instance wrapped in a `Result`.
	 * Returns `Result.error()` if `isValidProps()` returns `false`.
	 *
	 * @param props The properties to validate and construct the entity with.
	 * @returns A `Result` containing the new instance on success, or an error on failure.
	 */
	public static create(props: unknown): IResult<unknown, string> {
		// biome-ignore lint/complexity/noThisInStatic: Base factories must validate through the subclass constructor.
		if (!this.isValidProps(props)) {
			return Result.error(
				// biome-ignore lint/complexity/noThisInStatic: Error messages should name the concrete subclass.
				`Invalid props to create an instance of ${this.name}.`,
			);
		}
		return Result.success(new this(props as AnyObject));
	}

	/**
	 * @description
	 * Initializes a new `Entity` instance directly, throwing if props are invalid.
	 * Intended for tests and seeders — prefer `create()` in production code.
	 *
	 * @throws {DomainError} If not overridden in the subclass.
	 */
	public static init(_props: unknown): Entity<IEntityProps> {
		throw new DomainError(
			`${Entity.name}.init() is not implemented. Override this method in your subclass.`,
			{ context: Entity.name },
		);
	}

	/**
	 * @description Alias for `isValidProps()`.
	 */
	public static isValid(value: unknown): boolean {
		// biome-ignore lint/complexity/noThisInStatic: Static validation must dispatch to subclass overrides.
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
