// ── Core domain primitives ─────────────────────────────────────────────────
export { Aggregate } from "./core/aggregate";
export { Entity } from "./core/entity";
export { ID, Id } from "./core/id";
export { BaseRepository } from "./core/repository";
export { ValueObject } from "./core/value-object";
// ── Event system ───────────────────────────────────────────────────────────
export type { WindowLike } from "./events/browser-event-manager";
export { BrowserEventManager } from "./events/browser-event-manager";
export { BaseDomainEvent } from "./events/domain-event";
export { EventBus } from "./events/event-bus";
export { EventContext } from "./events/event-context";
export { BaseEventManager } from "./events/event-manager";
export { ValidateEventName } from "./events/event-utils";
export { ServerEventManager } from "./events/server-event-manager";
// ── Helpers ────────────────────────────────────────────────────────────────
export type { EntityAutoMapperPayload } from "./helpers/auto-mapper";
export { AutoMapper } from "./helpers/auto-mapper";
export type { CreateManyResult } from "./helpers/domain-classes";
export { DomainClasses } from "./helpers/domain-classes";
export { DomainError } from "./helpers/domain-error";
export type {
	GettersSettersConfig,
	ParentKind,
} from "./helpers/getters-setters";
export { GettersAndSetters } from "./helpers/getters-setters";

// ── Libs ───────────────────────────────────────────────────────────────────
export { Iterator } from "./libs/iterator";
export { Result } from "./libs/result";
export { Utils } from "./libs/utils";
export { Validator } from "./libs/validator";

// ── Types ──────────────────────────────────────────────────────────────────
export type { Adapter, IAdapter } from "./types/adapter.types";
export type { ICommand, IQuery, IUseCase } from "./types/command.types";
export type {
	AggregateConstructor,
	EntityConstructor,
	EntityProps,
	IEntityProps,
	IEntitySettings,
} from "./types/entity.types";
export type {
	DomainEvent,
	DomainEventPayload,
	EventEntry,
	IEventBus,
} from "./types/event.types";
export type { IIterator, IIteratorConfig } from "./types/iterator.types";
export type {
	IResult,
	IResultExecuteFn,
	IResultHook,
	IResultObject,
	IResultOption,
} from "./types/result.types";
export type { UID } from "./types/uid.types";
export type {
	AnyObject,
	BuiltIns,
	CalcOpt,
	Primitive,
	ReadonlyDeep,
} from "./types/utils.types";
export type {
	IValueObjectSettings,
	ValueObjectConstructor,
} from "./types/value-object.types";

// ── Utils ──────────────────────────────────────────────────────────────────
export { DeepFreeze, StableStringify } from "./utils/object.utils";
export { InvalidPropsType } from "./utils/type.utils";

import validator from "./libs/validator";

export { validator };
