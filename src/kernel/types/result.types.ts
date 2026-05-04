import type { ICommand } from "./command.types";
import type { AnyObject } from "./utils.types";

/**
 * @description
 * Represents the result of an operation, encapsulating its state, value, error, and metadata.
 *
 * @template T The type of the result's value.
 * @template D The type of the result's error (default: string).
 * @template M The type of the result's metadata (default: empty object).
 */
export interface IResult<T, D = string, M = AnyObject> {
	/**
	 * @description
	 * Retrieves the error of the result. Returns null if the result represents success.
	 *
	 * @returns The result's error or null.
	 */
	error(): D;
	/**
	 * @description
	 * Executes a command based on the result's state (success or failure).
	 *
	 * @template X The input type for the command.
	 * @template Y The output type of the command.
	 * @param command The command to execute.
	 * @returns An object containing hooks for further execution.
	 */
	execute: <X, Y>(command: ICommand<X, Y>) => IResultExecuteFn<X, Y>;
	/**
	 * @description
	 * Checks if the result represents a failure.
	 *
	 * @returns True if the result is a failure, false otherwise.
	 */
	isError(): boolean;
	/**
	 * @description
	 * Checks if the result contains a null value.
	 *
	 * @returns True if the value is null, false otherwise.
	 */
	isNull(): boolean;
	/**
	 * @description
	 * Checks if the result represents success.
	 *
	 * @returns True if the result is a success, false otherwise.
	 */
	isSuccess(): boolean;
	/**
	 * @description
	 * Retrieves the metadata associated with the result.
	 *
	 * @returns The result's metadata.
	 */
	metaData(): M;
	/**
	 * @description
	 * Converts the result into an object representing its current state.
	 *
	 * @returns An object containing the result's value, error, and metadata.
	 */
	toObject(): IResultObject<T, D, M>;
	/**
	 * @description
	 * Retrieves the value of the result. Returns null if the result represents a failure.
	 *
	 * @returns The result's value or null.
	 */
	value(): T;
}

/**
 * @description
 * Represents the possible states of a result: success (`success`) or failure (`error`).
 */
export type IResultOption = "error" | "success";

/**
 * @description
 * Hook for handling specific result states during execution.
 *
 * @template Y The type of the hook's output.
 */
export interface IResultHook<Y> {
	/**
	 * @description
	 * Executes a function based on the result state.
	 *
	 * @param option The result state to handle (`success` or `error`).
	 * @returns The result of the function execution, if applicable.
	 */
	on(option: IResultOption): Promise<IResult<Y, string>> | undefined;
}

/**
 * @description
 * Extends `IResultHook` with support for data input.
 *
 * @template X The input type for the hook.
 * @template Y The output type for the hook.
 */
export interface IResultExecuteFn<X, Y> extends IResultHook<Y> {
	withData(data: X): IResultHook<Y>;
}

/**
 * @description
 * Represents the state of a result, including its value, error, and metadata.
 *
 * @template T The type of the result's value.
 * @template D The type of the result's error.
 * @template M The type of the result's metadata.
 */
export interface IResultObject<T, D, M> {
	data: T | null;
	error: D | null;
	isError: boolean;
	isSuccess: boolean;
	metaData: M;
}
