import type { AnyObject } from "./utils.types";

/**
 * @description
 * Represents the base shape of an entity's properties.
 * All entity props must be a plain object, optionally containing
 * identity and lifecycle metadata fields.
 */
export type IEntityProps = AnyObject & {
	id?: string;
	createdAt?: Date;
	updatedAt?: Date;
};

/**
 * @description
 * Configuration options for getter and setter behavior on an entity instance.
 */
export interface IEntitySettings {
	disableGetters?: boolean;
	disableSetters?: boolean;
}
