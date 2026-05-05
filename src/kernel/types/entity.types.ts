import type { UID } from "./uid.types";

/**
 * @description
 * Represents the static side (constructor + factory contract) of an `Aggregate` subclass.
 *
 * Mirrors `EntityConstructor` but scoped to `Aggregate` subclasses, enabling the same
 * polymorphic `this`-typed factory pattern used by `Entity.create()` and `Entity.init()`.
 *
 * @template Props The shape of the aggregate's user-defined domain properties.
 * @template T The concrete `Aggregate` subclass type.
 */
export type AggregateConstructor<Props extends object, T> = {
	isValidProps(props: Props): boolean;
	readonly name: string;
	prototype: T;
};

/**
 * @description
 * Represents the static side (constructor + factory contract) of an `Entity` subclass.
 *
 * Used by `Entity.create()` and `Entity.init()` to enable the polymorphic
 * `this`-typed factory pattern — calling `User.create(props)` infers `T = User`
 * automatically without requiring subclasses to override the factory.
 *
 * @template Props The shape of the entity's user-defined domain properties.
 * @template T The concrete `Entity` subclass type.
 */
export type EntityConstructor<Props extends object, T> = {
	isValidProps(props: Props): boolean;
	readonly name: string;
	prototype: T;
};

/**
 * @description
 * Merges user-defined `Props` with the implicit Entity lifecycle fields.
 */
export type EntityProps<T extends object> = T & {
	id?: string | number | UID<string>;
	createdAt?: Date;
	updatedAt?: Date;
};

/**
 * @description
 * Represents the base constraint for an entity's user-defined properties.
 * Must be a plain object (no primitives, arrays, or class instances).
 */
export type IEntityProps = object;

/**
 * @description
 * Configuration options for getter and setter behavior on an entity instance.
 */
export interface IEntitySettings {
	disableGetters?: boolean;
	disableSetters?: boolean;
}
