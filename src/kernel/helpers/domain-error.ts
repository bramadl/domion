/**
 * @description
 * Represents a domain-level error thrown when a business rule or invariant is violated.
 *
 * Unlike generic `Error`, `DomainError` carries structured context about where and why
 * the violation occurred, making it easier to handle, log, and surface meaningful
 * feedback to callers.
 *
 * Use `DomainError` whenever a domain operation fails due to an invariant violation —
 * for example, when `set().to()` receives an invalid value, or when a required domain
 * rule is not satisfied.
 *
 * @example
 * ```typescript
 * throw new DomainError('Amount must be positive', {
 *     field: 'amount',
 *     context: 'Money',
 * });
 * ```
 */
export class DomainError extends Error {
	public readonly field?: string;
	public readonly context?: string;

	/**
	 * @description
	 * Creates a new `DomainError` instance.
	 *
	 * @param message A human-readable description of the violation.
	 * @param options Optional structured context about the violation.
	 * @param options.field The property or field name that caused the error.
	 * @param options.context The domain class or context name where the error originated.
	 */
	constructor(
		message: string,
		options?: { field?: string; context?: string; cause?: unknown },
	) {
		super(message, { cause: options?.cause });
		this.name = "DomainError";
		this.field = options?.field;
		this.context = options?.context;

		// Maintains proper stack trace in V8 environments (Node.js, Bun, Chrome)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, DomainError);
		}
	}
}
