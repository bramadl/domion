import type { IResult } from "./result.types";

/**
 * @description
 * Represents a command — an operation that changes state and returns a Result.
 *
 * @template Input The input type.
 * @template Output The output type.
 * @template Error The error types if any–defaults to string.
 */
export interface ICommand<Input = void, Output = void, Error = string> {
	execute(input: Input): Promise<IResult<Output, Error>>;
}

/**
 * @description
 * Represents a query — a read-only operation that returns data without changing state.
 * Queries should never produce side effects.
 *
 * @template Input The query parameters type.
 * @template Output The returned data type.
 * @template Error The error types if any–defaults to string.
 */
export interface IQuery<Input = void, Output = void, Error = string> {
	execute(input: Input): Promise<IResult<Output, Error>>;
}

/**
 * @description
 * Convenience alias — a use case is either a Command or a Query.
 * Use `ICommand` when the operation mutates state.
 * Use `IQuery` when the operation is read-only.
 *
 * @template Input The input type.
 * @template Output The output type.
 * @template Error The error types if any–defaults to string.
 */
export type IUseCase<Input = void, Output = void, Error = string> = ICommand<
	Input,
	Output,
	Error
>;
