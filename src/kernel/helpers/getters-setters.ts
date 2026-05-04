import { ID } from "../core/id";
import utils, { type Utils } from "../libs/utils";
import validator, { type Validator } from "../libs/validator";
import type { UID } from "../types/uid.types";
import type { AnyObject } from "../types/utils.types";
import { DomainError } from "./domain-error";

/**
 * @description
 * Discriminator indicating which domain primitive this instance belongs to.
 * Used internally to apply different mutation behaviors for `ValueObject` vs `Entity`.
 */
export type ParentKind = "ValueObject" | "Entity";

/**
 * @description
 * Configuration options for enabling or disabling getter and setter access
 * on a domain object instance.
 *
 * Disabling getters or setters can be useful when enforcing strict encapsulation
 * or building read-only / write-only domain primitives.
 */
export interface GettersSettersConfig {
	/**
	 * @description
	 * When `true`, calling `get()` on this instance will throw a `DomainError`.
	 * @default false
	 */
	disableGetters?: boolean;

	/**
	 * @description
	 * When `true`, calling `set().to()` or `change()` on this instance will throw a `DomainError`.
	 * @default false
	 */
	disableSetters?: boolean;
}

/**
 * @description
 * Base class providing typed getter, setter, and validation infrastructure
 * for all domain primitives (`ValueObject` and `Entity`).
 *
 * `GettersAndSetters` is not intended to be instantiated directly. It is extended
 * by `ValueObject` and `Entity`, which pass their `parentKind` to enable
 * kind-specific behavior (e.g., auto-updating `updatedAt` on Entity mutations).
 *
 * Subclasses may override `validation()` to enforce per-key domain invariants
 * that are checked automatically on every `set().to()` or `change()` call.
 *
 * @template Props The shape of the domain object's properties.
 *
 * @example
 * ```typescript
 * class Age extends ValueObject<{ value: number }> {
 *     validation<Key extends keyof { value: number }>(
 *         value: { value: number }[Key],
 *         key: Key,
 *     ): boolean {
 *         if (key === 'value') return (value as number) > 0;
 *         return true;
 *     }
 * }
 * ```
 */
export class GettersAndSetters<Props> {
	protected static readonly util: Utils = utils;
	protected static readonly validator: Validator = validator;
	protected readonly util: Utils = utils;
	protected readonly validator: Validator = validator;
	protected parentKind: ParentKind = "ValueObject";
	protected config: GettersSettersConfig = {
		disableGetters: false,
		disableSetters: false,
	};

	constructor(
		protected props: Props,
		parentKind: ParentKind,
		config?: GettersSettersConfig,
	) {
		this.parentKind = parentKind;
		this.config.disableGetters = !!config?.disableGetters;
		this.config.disableSetters = !!config?.disableSetters;
	}

	/**
	 * @description
	 * Handles the special case of assigning a new identity (`id`) to an Entity.
	 *
	 * Accepts a string, number, or existing `UID` instance. In all cases, the
	 * internal `_id` field and `props.id` are updated in sync, and `updatedAt`
	 * is refreshed to reflect the mutation.
	 *
	 * This method is only called when `key === 'id'` and `parentKind === 'Entity'`.
	 *
	 * @param value The new identity value — a string, number, or `UID` instance.
	 */
	private applyEntityId<Key extends keyof Props>(value: Props[Key]): void {
		const self = this as unknown as AnyObject;

		if (this.validator.isString(value) || this.validator.isNumber(value)) {
			const newId = ID.create(value as string | number);
			self._id = newId;
			(this.props as AnyObject).id = newId.value();
			this.touchUpdatedAt();
			return;
		}

		if (this.validator.isID(value)) {
			self._id = value;
			(this.props as AnyObject).id = (value as unknown as UID).value();
			this.touchUpdatedAt();
		}
	}

	/**
	 * @description
	 * Applies a validated value to the specified property key.
	 *
	 * Delegates to `applyEntityId()` when the key is `'id'` and the parent
	 * is an `Entity`. Otherwise, directly assigns the value and, for entities,
	 * updates the `updatedAt` timestamp via `touchUpdatedAt()`.
	 *
	 * @param key The property key to assign to.
	 * @param value The validated value to apply.
	 */
	private applyValue<Key extends keyof Props>(
		key: Key,
		value: Props[Key],
	): void {
		if (key === "id" && this.parentKind === "Entity") {
			this.applyEntityId(value);
			return;
		}

		(this.props as AnyObject)[key as string] = value;

		if (this.parentKind === "Entity") {
			this.touchUpdatedAt();
		}
	}

	/**
	 * @description
	 * Asserts that setters are currently enabled on this instance.
	 * Throws a `DomainError` if `disableSetters` is `true` in the config.
	 *
	 * @param key The property key being targeted, used to build the error message.
	 * @throws {DomainError} If setters are disabled.
	 */
	private assertSettersEnabled<Key extends keyof Props>(key: Key): void {
		if (this.config.disableSetters) {
			const name = Reflect.getPrototypeOf(this)?.constructor.name;
			throw new DomainError(
				`Attempted to set key "${String(key)}" but setters are disabled on ${name}.`,
			);
		}
	}

	/**
	 * @description
	 * Runs validation for a property assignment, applying both the external
	 * validation function (if provided) and the instance's `validation()` hook.
	 *
	 * External validation is checked first. If it returns `false`, a `DomainError`
	 * is thrown immediately without calling `validation()`.
	 *
	 * @param key The property key being validated.
	 * @param value The value being assigned.
	 * @param externalValidation An optional caller-provided validation function.
	 * @throws {DomainError} If either validation step fails.
	 */
	private assertValid<Key extends keyof Props>(
		key: Key,
		value: Props[Key],
		externalValidation?: (value: Props[Key]) => boolean,
	): void {
		const name = Reflect.getPrototypeOf(this)?.constructor.name;

		if (
			typeof externalValidation === "function" &&
			!externalValidation(value)
		) {
			throw new DomainError(
				`Validation failed for key "${String(key)}" in ${name}.`,
				{ field: String(key), context: name },
			);
		}

		if (!this.validation(value, key)) {
			throw new DomainError(
				`Invariant violated for key "${String(key)}" in ${name}.`,
				{ field: String(key), context: name },
			);
		}
	}

	/**
	 * @description
	 * Direct setter — validates then assigns a value to the specified property key.
	 * Equivalent to `set(key).to(value, validation)` but without the fluent chain.
	 * Throws a `DomainError` if setters are disabled or validation fails.
	 *
	 * @param key The property key to change.
	 * @param value The new value.
	 * @param validation Optional validation function.
	 * @returns `true` if successfully changed.
	 *
	 * @throws {DomainError} If setters are disabled or validation fails.
	 *
	 * @example
	 * ```typescript
	 * entity.change('age', 25, (age) => age > 0);
	 * ```
	 */
	public change<Key extends keyof Props>(
		key: Key,
		value: Props[Key],
		validation?: (value: Props[Key]) => boolean,
	): boolean {
		this.assertSettersEnabled(key);
		this.assertValid(key, value, validation);
		this.applyValue(key, value);
		return true;
	}

	/**
	 * @description
	 * Retrieves the value of a specified property key.
	 * Throws a `DomainError` if getters are disabled on this instance.
	 *
	 * For primitive props (string, number, boolean), use the key `'value'`
	 * to retrieve the raw value directly.
	 *
	 * @param key The property key to retrieve.
	 * @returns The readonly value of the specified key.
	 *
	 * @throws {DomainError} If getters are disabled.
	 *
	 * @example
	 * ```typescript
	 * const age = person.get('age'); // 30
	 * const raw = stringVo.get('value'); // 'hello'
	 * ```
	 */
	public get<Key extends keyof Props>(key: Key): Readonly<Props[Key]> {
		if (this.config.disableGetters) {
			const name = Reflect.getPrototypeOf(this)?.constructor.name;
			throw new DomainError(
				`Attempted to get key "${String(key)}" but getters are disabled on ${name}.`,
			);
		}

		if (
			this.validator.isDate(this.props) ||
			this.validator.isArray(this.props)
		) {
			return this.props as unknown as Readonly<Props[Key]>;
		}

		if (key === "value") {
			if (this.validator.isSymbol(this.props)) {
				return (this.props as symbol).description as unknown as Readonly<
					Props[Key]
				>;
			}
			if (
				this.validator.isBoolean(this.props) ||
				this.validator.isNumber(this.props) ||
				this.validator.isString(this.props)
			) {
				return this.props as unknown as Readonly<Props[Key]>;
			}
			if (this.validator.isID(this.props)) {
				return (this.props as unknown as UID).value() as unknown as Readonly<
					Props[Key]
				>;
			}
		}

		const obj = this.props as AnyObject;
		return (obj[key as string] ?? null) as Readonly<Props[Key]>;
	}

	/**
	 * @description
	 * Returns the raw properties of the domain instance as a frozen, read-only object.
	 *
	 * @returns A frozen copy of the internal props.
	 */
	public getRaw(): Readonly<Props> {
		return Object.freeze(this.props);
	}

	/**
	 * @description
	 * Fluent setter — validates then assigns a value to the specified property key.
	 * Throws a `DomainError` if setters are disabled or validation fails.
	 *
	 * @param key The property key to set.
	 * @returns An object with a `to` method to complete the assignment.
	 *
	 * @example
	 * ```typescript
	 * entity.set('age').to(30, (age) => age > 0);
	 * ```
	 */
	public set<Key extends keyof Props>(
		key: Key,
	): {
		to: (
			value: Props[Key],
			validation?: (value: Props[Key]) => boolean,
		) => boolean;
	} {
		return {
			to: (
				value: Props[Key],
				validation?: (value: Props[Key]) => boolean,
			): boolean => {
				this.assertSettersEnabled(key);
				this.assertValid(key, value, validation);
				this.applyValue(key, value);
				return true;
			},
		};
	}

	/**
	 * @description
	 * Updates the `updatedAt` field on `props` to the current timestamp.
	 *
	 * Called automatically after any successful mutation on an `Entity` instance
	 * to reflect that the domain object's state has changed.
	 */
	private touchUpdatedAt(): void {
		(this.props as AnyObject).updatedAt = new Date();
	}

	/**
	 * @description
	 * Hook for subclasses to define per-key validation rules.
	 * Called automatically by `set().to()` and `change()` before applying a value.
	 * Override this in your domain class to enforce invariants.
	 *
	 * @param _value The value to validate.
	 * @param _key The property key being validated.
	 * @returns `true` if the value is valid; `false` otherwise.
	 *
	 * @example
	 * ```typescript
	 * validation<Key extends keyof Props>(value: Props[Key], key: Key): boolean {
	 *     if (key === 'age') return (value as number) > 0;
	 *     return true;
	 * }
	 * ```
	 */
	public validation<Key extends keyof Props>(
		_value: Props[Key],
		_key: Key,
	): boolean {
		return true;
	}
}
