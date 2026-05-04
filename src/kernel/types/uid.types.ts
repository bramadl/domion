/**
 * @description
 * Represents a unique identifier (UID) with methods for manipulation and comparison.
 *
 * @template T The type of the UID's value (default: string).
 */
export interface UID<T = string> {
	clone(): UID<T>;
	cloneAsNew(): UID<string>;
	createdAt(): Date;
	deepEqual(id: UID<string>): boolean;
	equal(id: UID<string>): boolean;
	isEqual(id: UID<string>): boolean;
	isNew(): boolean;
	isShort(): boolean;
	value(): string;
	toShort(): UID<string>;
}
