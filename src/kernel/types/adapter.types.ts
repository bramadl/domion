import type { IResult } from "./result.types";

/**
 * @description
 * Represents a simpler adapter for transforming objects.
 *
 * @template A The input type.
 * @template B The output type.
 */
export interface Adapter<A = unknown, B = unknown> {
	adaptOne(item: A): B;
	adaptMany?(items: Array<A>): Array<B>;
}

/**
 * @description
 * Represents an adapter that transforms one type to another.
 *
 * @template F The input type.
 * @template T The output type.
 * @template E The error type (default: void).
 * @template M The metadata type (default: void).
 */
export interface IAdapter<F, T, E = void, M = void> {
	build(target: F): IResult<T, E, M>;
}
