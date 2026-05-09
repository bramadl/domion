import type { IIterator, IIteratorConfig } from "../types/iterator.types";

/**
 * @description
 * The `Iterator` class provides a way to traverse through a collection of items sequentially,
 * without exposing the underlying data structure. It supports both forward and backward traversal,
 * optional looping behavior, and methods to manipulate the underlying collection.
 */
export class Iterator<T> implements IIterator<T> {
	private readonly items: Array<T>;
	private readonly restartOnFinish: boolean;
	private readonly returnCurrentOnReversion: boolean;
	private currentIndex: number;
	private lastCommand: "next" | "prev" | "none";

	private constructor(config?: IIteratorConfig<T>) {
		this.items = config?.initialData ?? [];
		this.restartOnFinish = !!config?.restartOnFinish;
		this.returnCurrentOnReversion = !!config?.returnCurrentOnReversion;
		this.currentIndex = -1;
		this.lastCommand = "none";
	}

	/**
	 * @description
	 * Creates a new `Iterator` instance from the provided configuration.
	 *
	 * @param config Optional configuration object.
	 * @param config.initialData An initial array of items to iterate over.
	 * @param config.returnCurrentOnReversion If `true`, the current item will be returned again before moving on when switching iteration direction.
	 * @param config.restartOnFinish If `true`, when reaching the end of the items, iteration continues from the opposite end, looping the iteration indefinitely.
	 *
	 * @returns A new `Iterator` instance.
	 */
	public static create<U>(config?: IIteratorConfig<U>): Iterator<U> {
		return new Iterator<U>(config);
	}

	/**
	 * @description
	 * Alias for `addToEnd` - adds a new item to the end of the collection.
	 *
	 * @param data The item to add.
	 * @returns The current `Iterator` instance.
	 */
	public add(data: T): Iterator<T> {
		return this.addToEnd(data);
	}

	/**
	 * @description
	 * Adds a new item to the end of the collection.
	 *
	 * @param data The item to add.
	 * @returns The current `Iterator` instance.
	 */
	public addToEnd(data: T): Iterator<T> {
		this.items.push(data);
		return this;
	}

	/**
	 * @description
	 * Adds a new item to the start of the collection and resets the cursor to before the first element.
	 *
	 * @param data The item to add.
	 * @returns The current `Iterator` instance.
	 */
	public addToStart(data: T): Iterator<T> {
		this.currentIndex = -1;
		this.items.unshift(data);
		return this;
	}

	/**
	 * @description
	 * Removes all items from the collection.
	 *
	 * @returns The current `Iterator` instance.
	 */
	public clear(): Iterator<T> {
		this.items.splice(0, this.total());
		this.currentIndex = -1;
		return this;
	}

	/**
	 * @description
	 * Creates a new Iterator instance with the same configuration and current state as the existing one.
	 *
	 * @returns A cloned Iterator instance.
	 */
	public clone(): IIterator<T> {
		return Iterator.create({
			initialData: this.toArray(),
			restartOnFinish: this.restartOnFinish,
			returnCurrentOnReversion: this.returnCurrentOnReversion,
		});
	}

	/**
	 * @description
	 * Returns the first item in the collection without changing the current index.
	 *
	 * @returns The first item, or `undefined` if empty.
	 */
	public first(): T {
		return this.items.at(0) as T;
	}

	/**
	 * @description
	 * Checks if there is another item after the current position.
	 *
	 * @returns `true` if another item is available after the current index, otherwise `false`.
	 */
	public hasNext(): boolean {
		if (this.isEmpty()) return false;
		return this.currentIndex + 1 < this.items.length;
	}

	/**
	 * @description
	 * Checks if there is another item before the current position.
	 *
	 * @returns `true` if another item is available before the current index, otherwise `false`.
	 */
	public hasPrev(): boolean {
		if (this.isEmpty()) return false;
		return this.currentIndex - 1 >= 0;
	}

	/**
	 * @description
	 * Checks if the iterator has no items.
	 *
	 * @returns `true` if there are no items, otherwise `false`.
	 */
	public isEmpty(): boolean {
		return this.total() === 0;
	}

	/**
	 * @description
	 * Returns the last item in the collection without changing the current index.
	 *
	 * @returns The last item, or `undefined` if empty.
	 */
	public last(): T {
		return this.items.at(-1) as T;
	}

	/**
	 * @description
	 * Moves the iterator forward and returns the next item.
	 *
	 * If `restartOnFinish` is `true` and the end is reached, iteration restarts from the beginning.
	 * If `restartOnFinish` is `false` and the end is reached, returns `null`.
	 *
	 * @returns The next item, or `null` if no next item exists and looping is disabled.
	 */
	public next(): T {
		if (this.hasNext()) {
			if (this.lastCommand === "prev" && this.currentIndex === 0) {
				this.lastCommand = "next";
				return this.items[this.currentIndex] as T;
			}
			const nextIndex = this.currentIndex + 1;
			this.currentIndex = nextIndex;
			this.lastCommand = this.returnCurrentOnReversion ? "next" : "none";
			return this.items[nextIndex] as T;
		}
		if (!this.restartOnFinish) return null as unknown as T;
		this.toFirst();
		return this.first();
	}

	/**
	 * @description
	 * Moves the iterator backward and returns the previous item.
	 *
	 * If `restartOnFinish` is `true` and the beginning is reached, iteration continues from the end.
	 * If `restartOnFinish` is `false` and the beginning is reached, returns `null`.
	 *
	 * @returns The previous item, or `null` if no previous item exists and looping is disabled.
	 */
	public prev(): T {
		if (this.hasPrev()) {
			if (
				this.lastCommand === "next" &&
				this.currentIndex === this.total() - 1
			) {
				this.lastCommand = "prev";
				return this.items[this.currentIndex] as T;
			}
			const prevIndex = this.currentIndex - 1;
			this.currentIndex = prevIndex;
			this.lastCommand = this.returnCurrentOnReversion ? "prev" : "none";
			return this.items[prevIndex] as T;
		}
		if (!this.restartOnFinish) return null as unknown as T;
		this.toLast();
		return this.last();
	}

	/**
	 * @description
	 * Removes the first item from the collection.
	 *
	 * @returns The current `Iterator` instance.
	 */
	public removeFirst(): Iterator<T> {
		if (this.currentIndex > 0) this.currentIndex -= 1;
		this.items.shift();
		return this;
	}

	/**
	 * @description
	 * Removes a specific item from the iterator's collection.
	 *
	 * If the item is found and removed, the current index is adjusted accordingly.
	 *
	 * @param item The item to be removed.
	 */
	public removeItem(item: T): void {
		const index = this.items.findIndex(
			(value) => JSON.stringify(item) === JSON.stringify(value),
		);

		if (index !== -1) {
			this.items.splice(index, 1);
			if (index >= this.currentIndex) this.prev();
		}
	}

	/**
	 * @description
	 * Removes the last item from the collection.
	 *
	 * @returns The current `Iterator` instance.
	 */
	public removeLast(): Iterator<T> {
		if (this.currentIndex >= this.total()) this.currentIndex -= 1;
		this.items.pop();
		return this;
	}

	/**
	 * @description
	 * Returns all items in the iterator as an array.
	 *
	 * @returns A copy of the internal array of items.
	 */
	public toArray(): Array<T> {
		return [...this.items];
	}

	/**
	 * @description
	 * Moves the internal cursor to the start of the collection.
	 *
	 * @returns The current `Iterator` instance.
	 */
	public toFirst(): Iterator<T> {
		if (this.currentIndex === 0 || this.currentIndex === -1) {
			this.currentIndex = -1;
			return this;
		}
		this.currentIndex = 0;
		return this;
	}

	/**
	 * @description
	 * Moves the internal cursor to the end of the collection.
	 *
	 * @returns The current `Iterator` instance.
	 */
	public toLast(): Iterator<T> {
		if (this.currentIndex === this.total() - 1 || this.currentIndex === -1) {
			this.currentIndex = this.total();
			return this;
		}
		this.currentIndex = this.total() - 1;
		return this;
	}

	/**
	 * @description
	 * Returns the total number of items in the iterator.
	 *
	 * @returns The count of items in the underlying collection.
	 */
	public total(): number {
		return this.items.length;
	}
}
