import validator, { type Validator } from "../libs/validator";
import type { AnyObject } from "../types/utils.types";

/**
 * @description
 * Defines the shape of data used for mapping an entity's properties.
 */
export interface EntityAutoMapperPayload {
	id: string;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * @description
 * The `AutoMapper` class is responsible for transforming domain resources (entities, value objects)
 * into plain objects or primitive values. It provides methods to recursively process nested value objects, IDs,
 * entities, and arrays, ensuring all complex data structures are serialized into a consistent object format.
 */
export class AutoMapper {
	private validator: Validator = validator;

	/**
	 * @description
	 * Transforms an entity into a plain object, including its associated meta properties
	 * (`id`, `createdAt`, `updatedAt`).
	 *
	 * This method:
	 * - Resolves IDs to their primitive value forms.
	 * - Recursively converts nested entities, aggregates, and value objects to plain objects.
	 * - Preserves arrays and transforms their elements as needed.
	 *
	 * @param entity The entity instance to be transformed into a plain object.
	 * @returns A plain object representing the entity, including its metadata and serialized properties.
	 */
	public entityToObj(entity: unknown): unknown {
		if (this.validator.isID(entity)) {
			return (entity as { value(): string }).value();
		}

		if (this.validator.isSymbol(entity)) {
			return (entity as symbol).description;
		}

		if (
			this.validator.isBoolean(entity) ||
			this.validator.isNumber(entity) ||
			this.validator.isString(entity) ||
			this.validator.isDate(entity) ||
			entity === null
		) {
			return entity;
		}

		if (this.validator.isValueObject(entity)) {
			return this.valueObjectToObj(entity);
		}

		if (this.validator.isArray(entity)) {
			return (entity as unknown[]).map((item) => this.valueObjectToObj(item));
		}

		if (this.validator.isObject(entity)) {
			const result: AnyObject = {};
			for (const key of Object.keys(entity as object)) {
				result[key] = this.entityToObj((entity as AnyObject)[key]);
			}
			return result;
		}

		if (this.validator.isEntity(entity) || this.validator.isAggregate(entity)) {
			return this.serializeEntity(entity);
		}

		return entity;
	}

	/**
	 * @description
	 * Serializes an entity or aggregate into a plain object, extracting its identity
	 * metadata (`id`, `createdAt`, `updatedAt`) and recursively converting all nested
	 * properties into their primitive or serialized equivalents.
	 *
	 * This method is called internally by `entityToObj` when the target is confirmed
	 * to be an entity or aggregate (identified via `__kind` marker).
	 *
	 * @param entity The entity or aggregate instance to serialize. Expected to have
	 * a `props` object and an `id` field exposing a `.value()` method.
	 * @returns A plain object representation of the entity, including all metadata
	 * and recursively serialized properties.
	 */
	private serializeEntity(entity: unknown): unknown {
		const e = entity as AnyObject;
		const props = (e.props ?? {}) as AnyObject;
		const id = (e.id as { value(): string } | undefined)?.value();

		const result: AnyObject & Partial<EntityAutoMapperPayload> = {
			id,
			createdAt: props.createdAt as Date | undefined,
			updatedAt: props.updatedAt as Date | undefined,
		};

		for (const key of Object.keys(props)) {
			if (key === "createdAt" || key === "updatedAt") continue;

			const val = props[key];

			if (this.validator.isID(val)) {
				result[key] = (val as { value(): string }).value();
			} else if (this.validator.isArray(val)) {
				result[key] = (val as unknown[]).map((item) => this.entityToObj(item));
			} else if (this.validator.isEntity(val)) {
				result[key] = this.entityToObj(val);
			} else if (this.validator.isSymbol(val)) {
				result[key] = (val as symbol).description;
			} else {
				result[key] = this.valueObjectToObj(val);
			}
		}

		return result;
	}

	/**
	 * @description
	 * Converts a value object into a plain object or a primitive value.
	 *
	 * This method handles multiple scenarios, including:
	 * - Null values
	 * - Symbol values
	 * - ID values
	 * - Simple data types (strings, numbers, booleans, dates, objects)
	 * - Nested value objects
	 * - Arrays containing complex data
	 *
	 * @param valueObject An instance representing a value object to be transformed.
	 * @returns A plain object, primitive value, or serialized structure derived from the given value object.
	 */
	public valueObjectToObj(valueObject: unknown): unknown {
		if (valueObject === null) return null;
		if (typeof valueObject === "undefined") return undefined;

		if (this.validator.isSymbol(valueObject)) {
			return (valueObject as symbol).description;
		}

		if (this.validator.isID(valueObject)) {
			return (valueObject as { value(): string }).value();
		}

		if (
			this.validator.isBoolean(valueObject) ||
			this.validator.isNumber(valueObject) ||
			this.validator.isString(valueObject) ||
			this.validator.isDate(valueObject)
		) {
			return valueObject;
		}

		if (this.validator.isArray(valueObject)) {
			return (valueObject as unknown[]).map((item) =>
				this.valueObjectToObj(item),
			);
		}

		if (this.validator.isObject(valueObject)) {
			const result: AnyObject = {};
			for (const key of Object.keys(valueObject as object)) {
				result[key] = this.entityToObj((valueObject as AnyObject)[key]);
			}
			return result;
		}

		// treat as VO with props
		const vo = valueObject as AnyObject;
		const voProps = vo.props;

		if (
			this.validator.isBoolean(voProps) ||
			this.validator.isNumber(voProps) ||
			this.validator.isString(voProps) ||
			this.validator.isDate(voProps)
		) {
			return voProps;
		}

		if (this.validator.isSymbol(voProps)) {
			return (voProps as symbol).description;
		}

		if (this.validator.isArray(voProps)) {
			return (voProps as unknown[]).map((item) => this.valueObjectToObj(item));
		}

		if (this.validator.isObject(voProps)) {
			const props = voProps as AnyObject;
			const result: AnyObject = {};

			for (const key of Object.keys(props)) {
				const val = props[key];

				if (this.validator.isValueObject(val)) {
					result[key] = this.valueObjectToObj(val);
				} else if (this.validator.isID(val)) {
					result[key] = (val as { value(): string }).value();
				} else if (this.validator.isSymbol(val)) {
					result[key] = (val as symbol).description;
				} else if (this.validator.isArray(val)) {
					result[key] = (val as unknown[]).map((item) =>
						this.valueObjectToObj(item),
					);
				} else {
					result[key] = val;
				}
			}

			return result;
		}

		return this.entityToObj(voProps);
	}
}
