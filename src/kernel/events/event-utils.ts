import { DomainError } from "../helpers";

/**
 * @description
 * Validates that an event name follows the required `context:EventName` format.
 *
 * @param eventName The event name to validate.
 * @throws {DomainError} If the event name does not contain a colon separator.
 */
export const ValidateEventName = (eventName: string): void => {
	if (!eventName.includes(":")) {
		throw new DomainError(
			`Invalid event name "${eventName}". ` +
				'Event names must follow the pattern "context:EventName" ' +
				'(e.g., "order:placed", "user:registered").',
			{ context: "DomainEvent" },
		);
	}
};
