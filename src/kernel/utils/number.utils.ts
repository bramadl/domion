/**
 * @description
 * Divides two numbers (`valueA` by `valueB`) with support for validation and normalization.
 * Handles edge cases such as non-numeric inputs and applies a specified precision to the result.
 *
 * @param valueA The dividend (numerator). Can be a number or a value convertible to a number.
 * @param valueB The divisor (denominator). Can be a number or a value convertible to a number.
 * @param precision The number of decimal places to apply to the result. Defaults to 5.
 * @returns The result of the division, normalized and adjusted to the specified precision.
 * Returns `0` if either value is not a valid number.
 *
 * @example
 * ```typescript
 * Divide(10, 2); // Returns 5
 * Divide(10, 3, 3); // Returns 3.333
 * Divide("10", "2"); // Returns 5 (handles string inputs)
 * Divide(NaN, 2); // Returns 0
 * ```
 */
export const Divide = (
	valueA: number,
	valueB: number,
	precision = 5,
): number => {
	const isValueOneNumber = typeof valueA === "number";
	const isValueTwoNumber = typeof valueB === "number";
	const isBothNumber = isValueOneNumber && isValueTwoNumber;

	if (!isBothNumber) {
		const isNaNValueA = IsNaN(valueA);
		const isNaNValueB = IsNaN(valueB);
		const isBothNaN = isNaNValueA && isNaNValueB;

		if (isBothNaN || isNaNValueA || isNaNValueB) return 0;
		const result = ToPrecision(
			Float(ToLong(Float(valueA)) / ToLong(Float(valueB))),
			precision,
		);

		return EnsureNumber(result);
	}

	const result = ToPrecision(Float(ToLong(valueA) / ToLong(valueB)), precision);
	return EnsureNumber(result);
};

/**
 * @description
 * Ensures the input is a valid number. If the input is `NaN` or `Infinity`, it returns `0`.
 *
 * @param value The number to validate.
 * @returns The original number if it is valid, or `0` if the input is `NaN` or `Infinity`.
 *
 * @example
 * ```typescript
 * EnsureNumber(42); // Returns 42
 * EnsureNumber(NaN); // Returns 0
 * EnsureNumber(Infinity); // Returns 0
 * ```
 */
export const EnsureNumber = (value: number): number => {
	if (Number.isNaN(value) || value === Infinity) return 0;
	return value;
};

/**
 * @description
 * Normalizes a value into a floating-point number (`float`).
 *
 * If the value is a string representation of a number, it parses it into a `float`.
 * If the value is already a number, it returns the value as is.
 * If the value is invalid (`NaN` or non-numeric), it returns `0`.
 *
 * @param value The input value to normalize. Can be a string or a number.
 * @returns A floating-point number representation of the input, or `0` if the input is invalid.
 *
 * @example
 * ```typescript
 * Float("123.45"); // Returns 123.45
 * Float(678.90); // Returns 678.9
 * Float("invalid"); // Returns 0
 * Float(NaN); // Returns 0
 * ```
 */
export const Float = (value: number): number => {
	if (typeof value === "string" && !IsNaN(value)) return parseFloat(value);
	if (typeof value === "number") return value;
	return 0;
};

/**
 * @description
 * Checks if the provided value is `NaN` (Not-a-Number). The function attempts to parse the value into a number
 * and determines if the result is `NaN`.
 *
 * @param value The value to check. Can be a string or a number.
 * @returns `true` if the value is `NaN`, otherwise `false`.
 *
 * @example
 * ```typescript
 * IsNaN("123"); // Returns false (valid number)
 * IsNaN("abc"); // Returns true (not a number)
 * IsNaN(NaN); // Returns true
 * IsNaN(123); // Returns false (valid number)
 * ```
 */
export const IsNaN = (value: string | number): boolean => {
	return Number.isNaN(parseFloat(String(value)));
};

/**
 * @description
 * Multiplies two numbers (`valueA` and `valueB`) with validation, normalization,
 * and optional precision adjustment. Handles edge cases where the inputs are not valid numbers.
 *
 * @param valueA The first value to multiply. Can be a number or a value convertible to a number.
 * @param valueB The second value to multiply. Can be a number or a value convertible to a number.
 * @param precision The number of decimal places to apply to the result. Defaults to 5.
 * @returns The result of the multiplication, normalized and adjusted to the specified precision.
 * Returns `0` if either value is not a valid number.
 *
 * @example
 * ```typescript
 * Multiply(10, 2); // Returns 20
 * Multiply(10, 2.5, 2); // Returns 25.00
 * Multiply("10", "3"); // Returns 30 (handles string inputs)
 * Multiply(NaN, 2); // Returns 0
 * ```
 */
export const Multiply = (
	valueA: number,
	valueB: number,
	precision = 5,
): number => {
	const isValueOneNumber = typeof valueA === "number";
	const isValueTwoNumber = typeof valueB === "number";
	const isBothNumber = isValueOneNumber && isValueTwoNumber;

	if (!isBothNumber) {
		const isNaNValueA = IsNaN(valueA);
		const isNaNValueB = IsNaN(valueB);
		const isBothNaN = isNaNValueA && isNaNValueB;

		if (isBothNaN || isNaNValueA || isNaNValueB) return 0;
		const result = ToPrecision(
			ToDecimal(
				Float(ToDecimal(ToLong(Float(valueA)) * ToLong(Float(valueB)))),
			),
			precision,
		);
		return EnsureNumber(result);
	}

	const result = ToPrecision(
		ToDecimal(Float(ToDecimal(ToLong(valueA) * ToLong(valueB)))),
		precision,
	);

	return EnsureNumber(result);
};

/**
 * @description
 * Subtracts one number (`valueB`) from another (`valueA`) with optional precision adjustment.
 * Handles edge cases where inputs are not valid numbers by normalizing the values or returning defaults.
 *
 * @param valueA The first value (minuend). Can be a number or a value convertible to a number.
 * @param valueB The second value (subtrahend). Can be a number or a value convertible to a number.
 * @param precision The number of decimal places to apply to the result. Defaults to 5.
 * @returns The result of the subtraction, normalized and adjusted to the specified precision.
 * Returns `0` if both inputs are `NaN`. If one of the inputs is invalid, the valid input is returned
 * (or negated if the second value is `NaN`).
 *
 * @example
 * ```typescript
 * Subtract(10, 2); // Returns 8
 * Subtract(10, "3.5", 2); // Returns 6.50
 * Subtract(NaN, 5); // Returns -5
 * Subtract(10, NaN); // Returns 10
 * Subtract(NaN, NaN); // Returns 0
 * ```
 */
export const Subtract = (
	valueA: number,
	valueB: number,
	precision = 5,
): number => {
	const isValueOneNumber = typeof valueA === "number";
	const isValueTwoNumber = typeof valueB === "number";
	const isBothNumber = isValueOneNumber && isValueTwoNumber;

	if (!isBothNumber) {
		const isNaNValueA = IsNaN(valueA);
		const isNaNValueB = IsNaN(valueB);
		const isBothNaN = isNaNValueA && isNaNValueB;

		if (isBothNaN) return 0;
		if (isNaNValueA) return Float(valueB) * -1;
		if (isNaNValueB) return Float(valueA);

		const result = ToPrecision(
			Float(ToDecimal(ToLong(Float(valueA)) - ToLong(Float(valueB)))),
			precision,
		);
		return EnsureNumber(result);
	}

	const result = ToPrecision(
		Float(ToDecimal(ToLong(valueA) - ToLong(valueB))),
		precision,
	);
	return EnsureNumber(result);
};

/**
 * @description
 * Adds two numbers (`valueA` and `valueB`) with optional precision adjustment.
 * Handles edge cases where inputs are not valid numbers by normalizing the values or returning defaults.
 *
 * @param valueA The first value to add. Can be a number or a value convertible to a number.
 * @param valueB The second value to add. Can be a number or a value convertible to a number.
 * @param precision The number of decimal places to apply to the result. Defaults to 5.
 * @returns The result of the addition, normalized and adjusted to the specified precision.
 * Returns `0` if both inputs are `NaN`. If one of the inputs is invalid, the valid input is returned.
 *
 * @example
 * ```typescript
 * Sum(10, 5); // Returns 15
 * Sum(10, "3.5", 2); // Returns 13.50
 * Sum(NaN, 5); // Returns 5
 * Sum(10, NaN); // Returns 10
 * Sum(NaN, NaN); // Returns 0
 * ```
 */
export const Sum = (valueA: number, valueB: number, precision = 5): number => {
	const isValueOneNumber = typeof valueA === "number";
	const isValueTwoNumber = typeof valueB === "number";
	const isBothNumber = isValueOneNumber && isValueTwoNumber;

	if (!isBothNumber) {
		const isNaNValueA = IsNaN(valueA);
		const isNaNValueB = IsNaN(valueB);
		const isBothNaN = isNaNValueA && isNaNValueB;

		if (isBothNaN) return 0;
		if (isNaNValueA) return Float(valueB);
		if (isNaNValueB) return Float(valueA);

		const result = ToPrecision(
			Float(ToDecimal(ToLong(Float(valueA)) + ToLong(Float(valueB)))),
			precision,
		);
		return EnsureNumber(result);
	}

	const result = ToPrecision(
		Float(ToDecimal(ToLong(valueA) + ToLong(valueB))),
		precision,
	);
	return EnsureNumber(result);
};

/**
 * @description
 * Converts a number to its decimal equivalent by dividing it by 100.
 * This is useful for normalizing values, such as converting percentages to decimals.
 *
 * @param value The input value to convert. Must be a number.
 * @returns The decimal equivalent of the input number.
 * If the input is not a valid number, it returns the input as is.
 *
 * @example
 * ```typescript
 * ToDecimal(500); // Returns 5
 * ToDecimal(25); // Returns 0.25
 * ToDecimal("100"); // Returns "100" (input not a valid number)
 * ```
 */
export const ToDecimal = (value: number): number => {
	const isValid = typeof value === "number";
	if (!isValid) return value;
	return value / 100;
};

/**
 * @description
 * Converts a number to its "long" equivalent by multiplying it by 100.
 * This is useful for denormalizing values, such as converting decimals to percentages.
 *
 * @param value The input value to convert. Must be a number.
 * @returns The "long" equivalent of the input number.
 * If the input is not a valid number, it returns the input as is.
 *
 * @example
 * ```typescript
 * ToLong(5); // Returns 500
 * ToLong(0.25); // Returns 25
 * ToLong("100"); // Returns "100" (input not a valid number)
 * ```
 */
export const ToLong = (value: number): number => {
	const isValid = typeof value === "number";
	if (!isValid) return value;
	return value * 100;
};

/**
 * @description
 * Adjusts a number or numeric string to a specified precision. The function ensures that the
 * result maintains the desired level of precision, handling both integer and decimal parts appropriately.
 *
 * @param value The input value to be adjusted. Can be a number or a numeric string.
 * @param precision The desired number of decimal places in the result.
 * @returns A number rounded to the specified precision. If the input is a string, it is parsed and adjusted accordingly.
 *
 * @example
 * ```typescript
 * ToPrecision(123.456789, 2); // Returns 123.46
 * ToPrecision("987.654321", 3); // Returns 987.654
 * ToPrecision(10.5, 1); // Returns 10.5
 * ```
 */
export const ToPrecision = (
	value: number | string,
	precision: number,
): number => {
	if (typeof value === "string") {
		return parseFloat(parseFloat(String(value)).toFixed(precision));
	}

	const int = Math.trunc(value) * 100;
	const dec = Number(
		((value * 100 - int) / 100)
			.toPrecision(precision + 3)
			.slice(0, precision + 2),
	);

	return Number(
		(int / 100 + dec).toPrecision(String(int).length + 1 + precision),
	);
};
