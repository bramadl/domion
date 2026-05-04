import type { IResult } from "./result.types";

/**
 * @description
 * Represents a command — an operation that changes state and returns a Result.
 *
 * @template Input The input type.
 * @template Output The output type.
 */
export interface ICommand<Input = void, Output = void> {
	execute(input: Input): Promise<IResult<Output, string>>;
}

/**
 * @description
 * Represents a query — a read-only operation that returns data without changing state.
 * Queries should never produce side effects.
 *
 * @template Input The query parameters type.
 * @template Output The returned data type.
 */
export interface IQuery<Input = void, Output = void> {
	execute(input: Input): Promise<IResult<Output, string>>;
}

/**
 * @description
 * Convenience alias — a use case is either a Command or a Query.
 * Use `ICommand` when the operation mutates state.
 * Use `IQuery` when the operation is read-only.
 *
 * @template Input The input type.
 * @template Output The output type.
 */
export type IUseCase<Input = void, Output = void> =
	| ICommand<Input, Output>
	| IQuery<Input, Output>;
