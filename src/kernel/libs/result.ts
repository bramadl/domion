import type { ICommand } from "../types/command.types";
import type { IIterator } from "../types/iterator.types";
import type {
	IResult,
	IResultExecuteFn,
	IResultHook,
	IResultObject,
	IResultOption,
} from "../types/result.types";
import type { AnyObject } from "../types/utils.types";
import { Iterator } from "./iterator";

/**
 * @description
 * The `Result` class represents the outcome of an operation, encapsulating both the success or failure state.
 *
 * A `Result` instance can contain a payload (`data`), an error, and optional metadata for additional context.
 * This pattern encourages explicit handling of operation success or failure, making your code more robust and expressive.
 *
 * @typeParam `T` - The type of the payload when the result is successful.
 * @typeParam `D` - The type of the error when the result is a failure. Defaults to `string`.
 * @typeParam `M` - The type of the metadata object. Defaults to an empty object `{}`.
 *
 */
export class Result<T = void, D = string, M = AnyObject>
	implements IResult<T, D, M>
{
	readonly #data: Readonly<T | null>;
	readonly #error: Readonly<D | null>;
	readonly #isError: Readonly<boolean>;
	readonly #isSuccess: Readonly<boolean>;
	readonly #metaData: Readonly<M>;

	private constructor(isSuccess: boolean, data?: T, error?: D, metaData?: M) {
		this.#data = data ?? null;
		this.#error = error ?? null;
		this.#isError = !isSuccess;
		this.#isSuccess = isSuccess;
		this.#metaData = metaData ?? ({} as M);
	}

	/**
	 * @description
	 * Creates a failure `Result` instance, optionally containing an error and metadata.
	 *
	 * @returns A `Result` instance representing failure.
	 */
	public static error<D = string, M = AnyObject, P = void>(
		error?: D,
		metaData?: M,
	): IResult<P, D, M>;
	public static error<D = string, M = AnyObject, T = void>(
		error: D,
		metaData?: M,
	): IResult<T, D, M> {
		const errorMessage =
			typeof error !== "undefined" && error !== null
				? error
				: "void error. no message!";

		const fail = new Result(
			false,
			null,
			errorMessage,
			metaData,
		) as unknown as IResult<T, D, M>;

		return Object.freeze(fail) as IResult<T, D, M>;
	}

	/**
	 * @description
	 * Combines multiple `Result` instances into a single `Result`.
	 *
	 * If any of the provided results is a failure, the combined `Result` is a failure.
	 * If all results are successful, the combined `Result` is considered a success.
	 *
	 * @param results An array of `Result` instances to combine.
	 * @returns A `Result` instance representing the combined outcome.
	 */
	public static combine<A = unknown, B = unknown, M = unknown>(
		results: Array<IResult<unknown, unknown, unknown>>,
	): IResult<A, B, M> {
		const iterator = Result.iterate(results);
		if (iterator.isEmpty()) {
			return Result.error(
				"No results provided on combine param" as B,
			) as unknown as IResult<A, B, M>;
		}

		while (iterator.hasNext()) {
			const currentResult = iterator.next();
			if (currentResult.isError()) return currentResult as IResult<A, B, M>;
		}

		return iterator.first() as IResult<A, B, M>;
	}

	/**
	 * @description
	 * Retrieves the error of the `Result`. If the `Result` is a success, `error()` returns `null`.
	 *
	 * @returns The error `D` or `null` if the result is a success.
	 */
	public error(): D {
		return this.#error as D;
	}

	/**
	 * @description
	 * Executes a command based on the result state. You can specify whether the command executes on success, failure, or both.
	 * Optionally, you can provide data to the command if required.
	 *
	 * @param command An object implementing `ICommand` interface.
	 * @returns An object with methods to configure command execution based on the `Result` state.
	 */
	public execute<X, Y>(command: ICommand<X, Y>): IResultExecuteFn<X, Y> {
		return {
			on: (
				option: IResultOption,
			): Promise<IResult<Y, string, AnyObject>> | undefined => {
				if (option === "success" && this.isSuccess())
					return command.execute(undefined as unknown as X);
				if (option === "error" && this.isError())
					return command.execute(undefined as unknown as X);
			},
			withData: (data: X): IResultHook<Y> => {
				return {
					on: (
						option: IResultOption,
					): Promise<IResult<Y, string, AnyObject>> | undefined => {
						if (option === "success" && this.isSuccess())
							return command.execute(data);
						if (option === "error" && this.isError())
							return command.execute(data);
					},
				};
			},
		};
	}

	/**
	 * @description
	 * Determines if the `Result` represents a failure state.
	 *
	 * @returns `true` if the result is a failure, `false` if it is a success.
	 */
	public isError(): boolean {
		return this.#isError;
	}

	/**
	 * @description
	 * Checks if the `Result` payload is `null`.
	 *
	 * This can be useful for confirming the presence or absence of a value before proceeding.
	 *
	 * @returns `true` if the payload is `null`, `false` otherwise.
	 */
	public isNull(): boolean {
		return this.#data === null || this.#isError;
	}

	/**
	 * @description
	 * Determines if the `Result` represents a success state.
	 *
	 * @returns `true` if the result is a success, `false` if it is a failure.
	 */
	public isSuccess(): boolean {
		return this.#isSuccess;
	}

	/**
	 * @description
	 * Creates an iterator over a collection of `Result` instances. This allows sequential processing of multiple results.
	 *
	 * @param results An array of `Result` instances.
	 * @returns An `Iterator` over the provided results.
	 */
	public static iterate<A, B, M>(
		results?: Array<IResult<A, B, M>>,
	): IIterator<IResult<A, B, M>> {
		return Iterator.create<IResult<A, B, M>>({
			initialData: results,
			returnCurrentOnReversion: true,
		});
	}

	/**
	 * @description
	 * Retrieves the metadata associated with the `Result`.
	 *
	 * @returns The metadata object `M`, or `{}` if no metadata was provided.
	 */
	public metaData(): M {
		const metaData = this.#metaData;
		return Object.freeze(metaData);
	}

	/**
	 * @description
	 * Creates a success `Result` instance, optionally containing data and metadata.
	 *
	 * @returns A `Result` instance representing success.
	 */
	public static success(): IResult<void>;
	public static success<T, M = AnyObject, D = string>(
		data: T,
		metaData?: M,
	): IResult<T, D, M>;
	public static success<T, M = AnyObject, D = string>(
		data?: T,
		metaData?: M,
	): IResult<T, D, M> {
		const _data = typeof data === "undefined" ? null : data;
		const ok = new Result(true, _data, null, metaData) as unknown as IResult<
			T,
			D,
			M
		>;
		return Object.freeze(ok) as IResult<T, D, M>;
	}

	/**
	 * @description
	 * Converts the `Result` instance into a plain object for easier logging or serialization.
	 *
	 * @returns An object containing `isSuccess`, `isError`, `data`, `error`, and `metaData`.
	 */
	public toObject(): IResultObject<T, D, M> {
		const metaData = {
			isSuccess: this.#isSuccess,
			isError: this.#isError,
			data: this.#data as T | null,
			error: this.#error as D | null,
			metaData: this.#metaData as M,
		};

		return Object.freeze(metaData);
	}

	/**
	 * @description
	 * Retrieves the payload of the `Result`. If the `Result` is a failure, `value()` returns `null`.
	 *
	 * @returns The payload `T` or `null` if the result is a failure.
	 */
	public value(): T {
		return this.#data as T;
	}
}
