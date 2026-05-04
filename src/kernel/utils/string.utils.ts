/**
 * @description
 * Removes characters from a string based on a condition defined by the provided `IsChar` function.
 *
 * @param target The input string from which characters will be removed.
 * @param IsChar A callback function that determines whether a character should be removed.
 * It receives a character as input and returns `true` if the character should be removed, or `false` otherwise.

 * @returns A new string with the characters removed based on the `IsChar` condition.
 * If the input `target` is not a string, it returns the input as is.
 *
 * @example
 * ```typescript
 * const isVowel = (char: string) => 'aeiou'.includes(char.toLowerCase());
 * const result = RemoveChars("Hello, World!", isVowel);
 * console.log(result); // "Hll, Wrld!"
 *
 * const isDigit = (char: string) => /\d/.test(char);
 * const result = RemoveChars("123abc456", isDigit);
 * console.log(result); // "abc"
 * ```
 */
export const RemoveChars = (
	target: string,
	IsChar: (char: string) => boolean,
): string => {
	if (typeof target !== "string") return target;

	const chars = target.split("");
	const str = chars.reduce((prev, current) => {
		const isSpecialChar = IsChar(current);
		if (isSpecialChar) return prev;
		return prev + current;
	}, "");

	return str;
};

/**
 * @description
 * Replaces all occurrences of a specified character in a string with a given value.
 * The replacement is performed globally (all occurrences).
 *
 * @param target The string in which the replacements will be made.
 * @param char The character or substring to replace. A global regular expression will be created based on this.
 * @param value The value to replace the `char` with. Can be a string or a number.
 * @returns A new string with all occurrences of `char` replaced by `value`.
 * If the inputs are not valid (e.g., `target` or `char` are not strings), the original `target` is returned unchanged.
 *
 * @example
 * ```typescript
 * // Example 1: Replace a character
 * const result = Replace("hello world", "o", "a");
 * console.log(result); // "hella warld"
 *
 * // Example 2: Replace a substring
 * const result = Replace("2024-12-15", "-", "/");
 * console.log(result); // "2024/12/15"
 *
 * // Example 3: Replace with a number
 * const result = Replace("Price: $$", "$", 100);
 * console.log(result); // "Price: 100100"
 * ```
 */
export const ReplaceChars = (
	target: string,
	char: string,
	value: string | number,
): string => {
	const pattern = RegExp(char, "g");
	const isValidTarget = typeof target === "string";
	const isValidChar = typeof char === "string";
	const isValidValue = typeof value === "string" || typeof value === "number";

	const isValid = isValidChar && isValidTarget && isValidValue;
	if (!isValid) return target;

	return target.replace(pattern, `${value}`);
};

/**
 * @description Removes all spaces from a given string. It utilizes the `RemoveChars` utility function,
 * passing a condition to identify spaces as the characters to remove.
 *
 * @param target The input string from which spaces will be removed.
 * @returns A new string with all spaces removed. If the input is not a valid string, it will return the input as is.
 *
 * @example
 * ```typescript
 * const result = RemoveSpaces("Hello, World!");
 * console.log(result); // "Hello,World!"
 *
 * const anotherResult = RemoveSpaces("   Open  AI ");
 * console.log(anotherResult); // "OpenAI"
 * ```
 */
export const RemoveSpaces = (target: string): string => {
	return RemoveChars(target, (char: string) => char === " ");
};

/**
 * @description
 * Converts a JavaScript value into a specialized flatted string. This method serializes
 * complex objects, including circular references, into a flat structure.
 *
 * @param value The JavaScript value to be stringified.
 * @returns A flatted string representation of the value.
 *
 * @example
 * ```typescript
 * const obj = { a: 1 };
 * obj.self = obj;
 * const result = Stringify(obj);
 * console.log(result); // Outputs a flatted string representing the object with circular references.
 * ```
 */
export const Stringify = (value: unknown): string => {
	const seen = new WeakSet();
	return (
		JSON.stringify(value, (_, val) => {
			if (typeof val === "object" && val !== null) {
				if (seen.has(val)) return "[Circular]";
				seen.add(val);
			}
			return val;
		}) ?? "undefined"
	);
};
