/**
 * @description
 * Defines the operations supported by an iterator for managing sequential traversal of items.
 *
 * @template T The type of items in the iterator.
 */
export interface IIterator<T> {
	addToEnd(data: T): IIterator<T>;
	add(data: T): IIterator<T>;
	addToStart(data: T): IIterator<T>;
	clear(): IIterator<T>;
	clone(): IIterator<T>;
	first(): T;
	hasNext(): boolean;
	hasPrev(): boolean;
	isEmpty(): boolean;
	last(): T;
	next(): T;
	prev(): T;
	removeFirst(): IIterator<T>;
	removeItem(item: T): void;
	removeLast(): IIterator<T>;
	toArray(): Array<T>;
	toFirst(): IIterator<T>;
	toLast(): IIterator<T>;
	total(): number;
}

/**
 * @description
 * Configuration options for creating an iterator.
 *
 * @template T The type of items in the iterator.
 */
export interface IIteratorConfig<T> {
	initialData?: Array<T>;
	restartOnFinish?: boolean;
	returnCurrentOnReversion?: boolean;
}
