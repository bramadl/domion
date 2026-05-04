import type { UID } from "./uid.types";

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
 * Represents the static side (constructor + factory contract) of an `Entity` subclass.
 */
export type EntityConstructor<Props extends object, T> = {
	isValidProps(props: Props): boolean;
	readonly name: string;
	prototype: T;
};

/**
 * @description
 * Configuration options for getter and setter behavior on an entity instance.
 */
export interface IEntitySettings {
	disableGetters?: boolean;
	disableSetters?: boolean;
}
