/**
 * @description
 * Recursively freezes an object to make it immutable. This prevents any modifications to the object or its nested properties.
 *
 * @typeParam T - The type of the object being frozen.
 * @param obj The object to be deeply frozen. If the input is not an object, it is returned as is.
 * @returns The same object, but deeply frozen to prevent further modifications.
 *
 * @example
 * ```typescript
 * const mutableObject = { a: 1, b: { c: 2 } };
 * const frozenObject = DeepFreeze(mutableObject);
 *
 * frozenObject.a = 2; // This will throw a TypeError in strict mode.
 * frozenObject.b.c = 3; // This will also throw a TypeError.
 * ```
 */
export const DeepFreeze = <T extends object>(obj: T): T => {
	if (!obj || typeof obj !== "object") return obj;

	Object.keys(obj).forEach((prop) => {
		const key = prop as keyof typeof obj;
		if (typeof obj[key] === "object" && !Object.isFrozen(obj[key]))
			DeepFreeze(obj[key] as T);
	});

	return Object.freeze(obj) as T;
};

/**
 * @description
 * Stringifies values with stable object key ordering so deeply equal objects
 * produce the same representation regardless of insertion order.
 */
export const StableStringify = (value: unknown): string => {
	const seen = new WeakSet<object>();

	const normalize = (target: unknown): unknown => {
		if (target === null || typeof target !== "object") {
			if (typeof target === "bigint") return target.toString();
			if (typeof target === "symbol") return target.description;
			if (typeof target === "function") return target.toString();
			return target;
		}

		if (target instanceof Date) return target.toISOString();

		if (seen.has(target)) return "[Circular]";
		seen.add(target);

		if (Array.isArray(target)) return target.map((item) => normalize(item));

		const result: Record<string, unknown> = {};
		for (const key of Object.keys(target).sort()) {
			result[key] = normalize((target as Record<string, unknown>)[key]);
		}
		return result;
	};

	return JSON.stringify(normalize(value));
};
