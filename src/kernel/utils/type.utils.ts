import validator from "../libs/validator";

/**
 * @description
 * Get the actual type instead of using the built-in `typeof` keyword for clearer type output.
 *
 * @param props The argument to check the type against.

 * @returns A string representing the actual type of the props.
 *
 * @example
 * ```typescript
 * const type = InvalidPropsType(null)
 * console.log(type) // "Null" instead of "object"
 * ```
 */
export const InvalidPropsType = (props: unknown): string => {
	if (validator.isAggregate(props)) return "Aggregate";
	if (validator.isArray(props)) return "Array";
	if (validator.isBoolean(props)) return "boolean";
	if (validator.isDate(props)) return "Date";
	if (validator.isEntity(props)) return "Entity";
	if (validator.isFunction(props)) return "Function";
	if (validator.isID(props)) return "ID";
	if (validator.isNull(props)) return "Null";
	if (validator.isNumber(props)) return "Number";
	if (validator.isObject(props)) return "Object";
	if (validator.isString(props)) return "String";
	if (validator.isSymbol(props)) return "Symbol";
	if (validator.isUndefined(props)) return "Undefined";
	if (validator.isValueObject(props)) return "Value Object";
	return typeof props;
};
