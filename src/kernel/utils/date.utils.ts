/** Supported time units for operations like incrementing or decrementing time. */
export type Unit = "minute" | "hour" | "day" | "week" | "month" | "year";

/** Milliseconds in common time units. */
export const ONE_MINUTE = 60000;
export const ONE_HOUR = ONE_MINUTE * 60;
export const ONE_DAY = ONE_HOUR * 24;
export const ONE_WEEK = ONE_DAY * 7;
export const ONE_MONTH = ONE_DAY * 30;
export const ONE_YEAR = ONE_DAY * 365;

/**
 * @description Decreases a given date by a specified amount of time based on the unit provided.
 *
 * @param date The starting date from which the time will be decremented.
 * @param value The number of units to decrement. If not a valid number, the original timestamp is returned.
 * @param unit The unit of time to decrement. Possible values are:
 * - `'day'`: Decrement by days.
 * - `'hour'`: Decrement by hours.
 * - `'minute'`: Decrement by minutes.
 * - `'month'`: Decrement by months.
 * - `'week'`: Decrement by weeks.
 * - `'year'`: Decrement by years.
 *
 * @returns The decremented timestamp as a number. If the input date is invalid, the current timestamp is returned.
 *
 * @example
 * ```typescript
 * const now = new Date();
 * const decrementedTime = DecrementTime(now, 2, 'day'); // Subtracts 2 days from the current date.
 * console.log(new Date(decrementedTime)); // Logs the decremented date.
 * ```
 */
export const DecrementTime = (
	date: Date,
	value: number,
	unit: Unit,
): number => {
	if (!(date instanceof Date)) return Date.now();

	const time = date.getTime();
	if (typeof value !== "number") return time;

	switch (unit) {
		case "day":
			return time - ONE_DAY * value;
		case "hour":
			return time - ONE_HOUR * value;
		case "minute":
			return time - ONE_MINUTE * value;
		case "month":
			return time - ONE_MONTH * value;
		case "week":
			return time - ONE_WEEK * value;
		case "year":
			return time - ONE_YEAR * value;
		default:
			return time;
	}
};

/**
 * @description
 * Increments a given date by a specified amount of time based on the unit provided.
 *
 * @param date The starting date to increment.
 * @param value The number of units to increment. If not a valid number, the original timestamp is returned.
 * @param unit The unit of time to increment. Possible values are:
 * - `'day'`: Increment by days.
 * - `'hour'`: Increment by hours.
 * - `'minute'`: Increment by minutes.
 * - `'month'`: Increment by months.
 * - `'week'`: Increment by weeks.
 * - `'year'`: Increment by years.
 *
 * @returns The incremented timestamp as a number. If the input date is invalid, the current timestamp is returned.
 *
 * @example
 * ```typescript
 * const now = new Date();
 * const incrementedTime = IncrementTime(now, 3, 'day'); // Adds 3 days to the current date.
 * console.log(new Date(incrementedTime)); // Logs the incremented date.
 * ```
 */
export const IncrementTime = (
	date: Date,
	value: number,
	unit: Unit,
): number => {
	if (!(date instanceof Date)) return Date.now();

	const time = date.getTime();
	if (typeof value !== "number") return time;

	switch (unit) {
		case "day":
			return ONE_DAY * value + time;
		case "hour":
			return ONE_HOUR * value + time;
		case "minute":
			return ONE_MINUTE * value + time;
		case "month":
			return ONE_MONTH * value + time;
		case "week":
			return ONE_WEEK * value + time;
		case "year":
			return ONE_YEAR * value + time;
		default:
			return time;
	}
};
