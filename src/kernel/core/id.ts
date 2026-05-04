import { UUID } from "../libs/crypto";
import type { UID } from "../types/uid.types";

/**
 * @description
 * Represents a unique identifier for Entities or Aggregates, providing methods
 * to generate and manipulate ID values, including the ability to create new IDs, convert them
 * to a shorter format, clone them, and check for equality.
 */
export class ID<T = string> implements UID<T> {
	protected readonly __kind = "ID" as const;

	readonly #maxSize: number = 16;
	#createdAt: Date;
	#isNew: boolean;
	#value: string;

	private constructor(id?: T) {
		this.#createdAt = new Date();

		if (typeof id === "undefined") {
			const uuid = UUID();
			this.#value = uuid;
			this.#isNew = true;
			return;
		}

		const isString = typeof id === "string";
		this.#value = isString ? (id as unknown as string) : String(id);
		this.#isNew = false;
	}

	/**
	 * @description
	 * Creates a new `ID` instance. If no `id` value is provided, a new
	 * UUID is generated. If an `id` is provided, that value is used directly.
	 *
	 * @param id Optional value to initialize the ID with. If not provided, a new UUID is created.
	 * @returns A `UID` instance.
	 */
	public static create<T = string | number>(id?: T): UID<string> {
		return new ID(id) as unknown as UID<string>;
	}

	/**
	 * @description
	 * Creates a clone of the current `UID` instance with the same value
	 * and properties, but without marking it as new.
	 *
	 * @returns A cloned `UID` instance identical to the current one.
	 */
	public clone(): UID<T> {
		return new ID(this.#value) as unknown as UID<T>;
	}

	/**
	 * @description
	 * Creates a new `UID` instance cloned from the current one, but marks
	 * the new clone as a new ID.
	 *
	 * @returns A cloned `UID` instance that is considered new.
	 */
	public cloneAsNew(): UID<string> {
		const newUUID = new ID<string>(this.#value);
		newUUID.setAsNew();
		return newUUID;
	}

	/**
	 * @description
	 * Retrieves the creation date of this `ID` instance.
	 *
	 * @returns The `Date` object representing when this ID was created or last modified.
	 */
	public createdAt(): Date {
		return this.#createdAt;
	}

	/**
	 * @description
	 * Performs a deep comparison by serializing both IDs and checking if
	 * the JSON representation is identical.
	 *
	 * @param id Another `UID` to compare to.
	 * @returns `true` if both IDs are deeply equal; otherwise `false`.
	 */
	public deepEqual(id: UID<unknown>): boolean {
		const A = JSON.stringify(this);
		const B = JSON.stringify(id);
		return A === B;
	}

	/**
	 * @description
	 * Compares the current ID against another `UID` instance by value.
	 *
	 * @param id Another `UID` to compare to.
	 * @returns `true` if both IDs share the same value type and string value, otherwise `false`.
	 */
	public equal(id: UID<unknown>): boolean {
		return (
			typeof this.#value === typeof id?.value() &&
			(this.#value as unknown) === id?.value()
		);
	}

	/**
	 * @description
	 * Alias for `equal`. Compares the current ID against another `UID` instance by value.
	 *
	 * @param id Another `UID` to compare to.
	 * @returns `true` if both IDs share the same value, otherwise `false`.
	 */
	public isEqual(id: UID<unknown>): boolean {
		return this.equal(id);
	}

	/**
	 * @description
	 * Indicates whether this `ID` instance was created as a new,
	 * previously uninitialized ID (no value passed to `create()`), or if it was
	 * initialized from a provided value.
	 *
	 * @returns `true` if the ID is new; otherwise, `false`.
	 */
	public isNew(): boolean {
		return this.#isNew;
	}

	/**
	 * @description
	 * Checks if the current ID is short (16 bytes).
	 *
	 * @returns `true` if the ID is 16 bytes long, `false` otherwise.
	 */
	public isShort(): boolean {
		return this.#value.length === this.#maxSize;
	}

	/**
	 * @description
	 * Marks the current ID as new.
	 */
	private setAsNew(): void {
		this.#isNew = true;
	}

	/**
	 * @description
	 * Creates a new short (16-byte) ID. If no `id` value is provided,
	 * a new UUID is generated and then shortened.
	 *
	 * @param id An optional string or number to use as the base value.
	 * @returns A `UID` instance with a short, 16-byte value.
	 */
	public static short(id?: string | number): UID<string> {
		const _id = new ID(id);
		if (typeof id === "undefined") _id.setAsNew();
		_id.toShort();
		return _id;
	}

	/**
	 * @description
	 * Convert the current ID value into a shortened, 16-byte version.
	 *
	 * If the current ID value is shorter than 16 bytes, a UUID is prepended to ensure
	 * sufficient length.
	 *
	 * @returns An updated `ID` instance with a short, 16-byte value.
	 */
	public toShort(): UID<string> {
		let short = "";
		let longValue = this.#value;

		if (longValue.length < this.#maxSize) {
			longValue = UUID() + longValue;
		}

		longValue = longValue.toUpperCase().replace(/-/g, "");
		const chars = longValue.split("");

		while (short.length < this.#maxSize) {
			const lastChar = chars.pop();
			short = lastChar + short;
		}
		this.#createdAt = new Date();
		this.#value = short;
		return this as unknown as UID<string>;
	}

	/**
	 * @description
	 * Retrieves the current ID value.
	 *
	 * @returns The ID value as a string.
	 */
	public value(): string {
		return this.#value;
	}
}

export const Id = ID.create;
