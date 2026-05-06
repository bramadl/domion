import { DomainError } from "../helpers";

/**
 * @description
 * Validates that an event name follows the required `context:EventName` format.
 *
 * @param eventName The event name to validate.
 * @throws {DomainError} If the event name does not contain a colon separator.
 */
export const ValidateEventName = (eventName: string): void => {
	if (typeof eventName !== "string") {
		throw new DomainError(`Invalid event name. Expected a string.`, {
			context: "DomainEvent",
		});
	}

	const parts = eventName.split(":");

	if (parts.length !== 2 || parts[0]?.length === 0 || parts[1]?.length === 0) {
		throw new DomainError(
			`Invalid event name "${eventName}". ` +
				'Event names must follow the pattern "context:EventName" ' +
				'(e.g., "order:placed", "user:registered").',
			{ context: "DomainEvent" },
		);
	}

	const validPattern = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;
	if (!validPattern.test(eventName)) {
		throw new DomainError(
			`Invalid event name "${eventName}". ` +
				"Context and event name must only contain lowercase letters, numbers, and hyphens " +
				'(e.g., "order:placed", "user:email-changed").',
			{ context: "DomainEvent" },
		);
	}
};
