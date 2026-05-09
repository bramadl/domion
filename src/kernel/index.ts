// ── Core domain primitives ─────────────────────────────────────────────────
export {
	Aggregate,
	BaseDomainEvent,
	BaseRepository,
	BaseSpecification,
	Entity,
	ID,
	Id,
	ValueObject,
} from "./core";

// ── Event system ───────────────────────────────────────────────────────────
export {
	BaseEventManager,
	BrowserEventManager,
	EventBus,
	EventContext,
	ServerEventManager,
} from "./events";

// ── Helpers ────────────────────────────────────────────────────────────────
export { Iterator } from "./helpers";

// ── Libs ───────────────────────────────────────────────────────────────────
export {
	DomainClasses,
	DomainError,
	Result,
	Utils,
	UUID,
	utils,
	Validator,
	validator,
} from "./libs";

// ── Types ──────────────────────────────────────────────────────────────────
export type {
	Adapter,
	AnyObject,
	DomainEvent,
	EventSubscriber,
	IAdapter,
	ICommand,
	IEventBus,
	IQuery,
	ISpecification,
	IUseCase,
	ReadonlyDeep,
	UID,
} from "./types";

// ── Utils ──────────────────────────────────────────────────────────────────
export {
	DecrementTime,
	DeepFreeze,
	Divide,
	EnsureNumber,
	Float,
	IncrementTime,
	IsNaN,
	Multiply,
	ONE_DAY,
	ONE_HOUR,
	ONE_MINUTE,
	ONE_MONTH,
	ONE_WEEK,
	ONE_YEAR,
	RemoveChars,
	RemoveSpaces,
	ReplaceChars,
	StableStringify,
	Stringify,
	Subtract,
	Sum,
	ToDecimal,
	ToLong,
	ToPrecision,
} from "./utils";
