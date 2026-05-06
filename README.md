# Domion

![version](https://img.shields.io/npm/v/domion?label=version)
![license](https://img.shields.io/npm/l/domion)

**Headless DDD primitives CLI for TypeScript**

A developer-first CLI tool for bringing Domain-Driven Design (DDD) primitives into any TypeScript project — copy the primitives, shape your architecture, and keep full control.

> ✅ No runtime dependency — everything is copied into your codebase. **The code is yours.**

---

## Table of Contents

- [Philosophy](#philosophy)
- [Why This Library?](#why-this-library)
- [Domain Concepts](#domain-concepts)
  - [Domain Layers](#domain-layers)
  - [Primitives at a Glance](#primitives-at-a-glance)
- [Getting Started](#getting-started)
  - [Initial Setup](#initial-setup)
  - [Configuration File](#configuration-file)
  - [Recommended Structure](#recommended-structure)
- [Core Features](#core-features)
  - [ID](#id)
  - [Value Object](#value-object)
  - [Entity](#entity)
  - [Aggregate](#aggregate)
  - [Repository](#repository)
  - [Use Cases](#use-cases)
- [API Reference](#api-reference)
  - [Core API](#core-api)
  - [Helpers](#helpers)
  - [Event System](#event-system)
- [CLI Reference](#cli-reference)
  - [info](#info)
  - [init](#init)
  - [list](#list)
  - [generate](#generate)
  - [sync](#sync)
  - [uninstall](#uninstall)
- [Roadmap](#roadmap)

---

## Philosophy

`domion` does **NOT**:

- ❌ Enforce folder structure
- ❌ Dictate architecture (layered, modular, etc.)
- ❌ Lock you into patterns

Instead, it:

- ✅ Provides DDD building blocks (`Entity`, `Value Object`, `Aggregate`, etc.)
- ✅ Generates boilerplate **you can fully control**
- ✅ Copies source code **directly into your project**

> 💡 After installation — **the code is yours.**

---

## Why This Library?

| Problem                                                   | Solution                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Anemic domain models with no business logic               | Rich `Entity` / `Aggregate` / `ValueObject` base classes                       |
| Throwing exceptions for validation failures               | `Result<T>` monad — explicit success / error without try-catch                 |
| No standard way to track domain mutations                 | `Aggregate.emit()` + `pullEvents()` lifecycle                                  |
| Boilerplate getters/setters with no invariant enforcement | `get()`, `set().to()`, `change()` with built-in validation hooks               |
| Unstructured runtime errors with no domain context        | First-class `DomainError` with `field` and `context` metadata                  |
| Serialization of nested domain objects                    | `toObject()` + `AutoMapper`                                                    |
| Event system tied to your domain model                    | Portable Event System — swap `EventBus`, use Redis, Kafka, BullMQ, or anything |

---

## Domain Concepts

### Domain Layers

Domain-Driven Design organizes code into layers of responsibility. This library provides the building blocks for the **Domain Layer** and defines the contracts for the **Application** and **Infrastructure** layers.

```
┌─────────────────────────────────────────────────┐
│                  Application Layer               │
│  Use Cases · Commands · Queries · Event Handlers │
├──────────────────────────────────────────────────┤
│                   Domain Layer                   │
│  Aggregates · Entities · Value Objects · Events  │
│  Repositories (contracts) · Domain Services      │
├──────────────────────────────────────────────────┤
│               Infrastructure Layer               │
│  Repository Implementations · Adapters           │
│  Event Bus / Message Queue / DB Drivers          │
└──────────────────────────────────────────────────┘
```

Key DDD principles this library embraces:

- **Rich domain models** — behavior lives inside domain classes, not in scattered services
- **Ubiquitous language** — class names and method names reflect your business domain
- **Bounded context** — each module is self-contained; entities in different contexts can share a name but have different behavior
- **Single responsibility** — non-cohesive behavior is delegated to other classes or raised as domain events

### Primitives at a Glance

| Primitive     | Identity    | Mutable      | Emits Events | Purpose                                                |
| ------------- | ----------- | ------------ | ------------ | ------------------------------------------------------ |
| `ValueObject` | ❌ By value | ❌ Immutable | ❌           | Domain concept defined entirely by its properties      |
| `Entity`      | ✅ By `id`  | ✅           | ❌           | Domain object with stable identity and lifecycle       |
| `Aggregate`   | ✅ By `id`  | ✅           | ✅           | Consistency boundary; single entry point for mutations |
| `ID`          | —           | —            | —            | Typed unique identifier (UUID or custom)               |

---

## Getting Started

### Initial Setup

Run directly with your preferred package manager — **no global install needed**:

```bash
# npm
npx domion init

# yarn
yarn dlx domion init

# pnpm
pnpm dlx domion init

# bun
bunx --bun domion init
```

Running `init -y` will skip interactive prompts and install defaults and:

1. Copy the library core into your project under `src/lib/domion`
2. Create a `domion.config.ts` configuration file
3. Prepare your project for code generators

### Configuration File

Below is the default configuration file created for you.

```ts
// domion.config.ts
export default {
  domion: {
    // Where the library source files are installed
    corePath: "src/lib/domion",

    // Import alias to use in your project (configure in tsconfig.json paths)
    importAlias: "domion",

    // File naming convention for generated files
    // Options: "kebab-case" | "snake_case" | "PascalCase"
    naming: "kebab-case",

    // Predefined output paths per generator type
    // Used with the --target flag when running `generate`
    targets: {
      entity: {
        // user: "src/modules/user/domain/entities"
      },
      valueObject: {
        // user: "src/modules/user/domain/value-objects"
      },
      aggregate: {},
      repository: {},
      usecase: {},
    },
  },
};
```

#### `naming` — File Naming Convention

Controls how generated file names are formatted:

| Value                    | Example                                       |
| ------------------------ | --------------------------------------------- |
| `kebab-case` _(default)_ | `user.entity.ts`, `pokemon-species.entity.ts` |
| `snake_case`             | `user.entity.ts`, `pokemon_species.entity.ts` |
| `PascalCase`             | `User.entity.ts`, `PokemonSpecies.entity.ts`  |

#### `targets` — Predefined Output Paths

Targets are named shortcuts to output directories, used with `--target` when generating code. Instead of typing the full path each time, define it once in config:

```ts
targets: {
  entity: {
    user: "src/modules/user/domain/entities",
    order: "src/modules/order/domain/entities",
  },
  valueObject: {
    shared: "src/shared/domain/value-objects",
  },
}
```

Then use it with:

```bash
npx domion generate entity --name=User --target=user
```

### Recommended Structure

This library is **headless** — it does not enforce any folder structure. Below is a suggestion based on DDD conventions:

```
src/
├── lib/
│   └── domion/        ← library source lives here (yours to modify)
│
└── modules/
    └── [module-name]/
        ├── domain/
        │   ├── aggregates/        ← Aggregate subclasses
        │   ├── entities/          ← Entity subclasses
        │   ├── value-objects/     ← ValueObject subclasses
        │   ├── events/            ← BaseDomainEvent subclasses (optional)
        │   └── interfaces/        ← Repository contracts, IEventBus, etc.
        ├── application/
        │   ├── use-cases/         ← ICommand / IQuery implementations
        │   └── services/          ← Application services, event handlers
        └── infrastructure/
            ├── repositories/      ← BaseRepository implementations
            └── adapters/          ← Adapter / IAdapter implementations
```

---

## Core Features

A high-level overview of the DDD building blocks this library provides. For full API details, see [API Reference](#api-reference).

### ID

Every entity and aggregate needs a stable unique identity. `ID` wraps a UUID string and carries one extra piece of metadata: whether the ID was **freshly generated** or **restored from persistence** — a distinction that matters when deciding whether to insert or update in a repository.

```typescript
const id = ID.create(); // new UUID, isNew() → true
const existing = ID.create("x"); // from DB, isNew() → false
const short = ID.short(); // 16-char short ID
```

### Value Object

A **Value Object** is a domain concept with no identity of its own — it is defined entirely by its properties. `Money(100, 'USD')` and another `Money(100, 'USD')` are the same thing. They are **immutable** by design: setters are disabled, and any mutation returns a new instance.

Use value objects to model domain concepts like `Money`, `Email`, `Address`, `DateRange`, `Quantity`, and any other concept where value matters more than identity.

```typescript
class Money extends ValueObject<MoneyProps> {
  public static isValidProps({ amount, currency }: MoneyProps): boolean {
    return (
      this.validator.number(amount).isPositive() &&
      this.validator.string(currency).hasLengthEqualTo(3)
    );
  }

  public add(other: Money): Money {
    return Money.create({
      amount: this.get("amount") + other.get("amount"),
      currency: this.get("currency"),
    }).value();
  }
}

const price = Money.create({ amount: 100, currency: "USD" });
```

### Entity

An **Entity** is a domain object with a stable, unique identity. Unlike value objects, two entities with different IDs are never equal — even if all their properties match. Entities track `createdAt` and `updatedAt` automatically, and any mutation refreshes `updatedAt`.

Use entities to model domain objects that have a lifecycle: `User`, `Product`, `Invoice`, `Ticket`, etc.

```typescript
class User extends Entity<UserProps> {
  public static isValidProps(props: UserProps): boolean {
    return (
      this.validator.isString(props.name) &&
      this.validator.isString(props.email)
    );
  }

  public rename(name: string): void {
    this.change("name", name, (v) => v.length > 0);
  }
}

const result = User.create({ name: "Alice", email: "alice@example.com" });
```

### Aggregate

An **Aggregate** is an Entity that acts as the **consistency boundary** of a domain model — the single entry point for all mutations within its boundary. It extends Entity with one key addition: the ability to record **domain events** via `emit()`.

After persisting the aggregate, the application layer drains the event queue with `pullEvents()` and hands events off to whichever transport it uses.

```typescript
class Order extends Aggregate<OrderProps> {
  public place(): void {
    this.change("status", "placed");
    this.emit({ type: "order:placed", payload: { total: this.get("total") } });
  }

  public ship(): void {
    if (this.get("status") !== "placed") {
      throw new DomainError("Order must be placed before shipping.", {
        context: "Order",
        field: "status",
      });
    }
    this.change("status", "shipped");
    this.emit({ type: "order:shipped" });
  }
}

// Somewhere within your Application layer
order.place();
await repo.save(order); // persist first
await bus.publishAll(order.pullEvents()); // then publish
```

> ⚠️ **Always `save()` before `pullEvents()`** — pulling before persistence risks delivering events for a state that was never committed.

### Repository

A **Repository** is the persistence contract for an aggregate. The interface is defined in the **domain layer** and implemented in the **infrastructure layer** — keeping your domain code free of storage concerns.

```typescript
class UserRepository extends BaseRepository<User> {
  async findById(id: string): Promise<IResult<User, string>> {
    /* ... */
  }
  async save(user: User): Promise<IResult<void, string>> {
    /* ... */
  }
  async delete(id: string): Promise<IResult<void, string>> {
    /* ... */
  }
  async exists(id: string): Promise<boolean> {
    /* ... */
  }
}
```

### Use Cases

Use cases are the entry points to your application logic. This library provides two interfaces to model them: `ICommand` for operations that mutate state, and `IQuery` for read-only operations.

```typescript
import type { ICommand, IQuery } from "domion";

// Mutates state — returns Result
class PlaceOrderUseCase implements ICommand<PlaceOrderInput, Order> {
  async execute(input: PlaceOrderInput): Promise<IResult<Order, string>> {
    const order = Order.init({
      customerId: input.customerId,
      status: "pending",
      total: input.total,
    });
    order.place();
    await this.repo.save(order);
    await this.bus.publishAll(order.pullEvents());
    return Result.success(order);
  }
}

// Read-only — returns data without side effects
class GetOrderUseCase implements IQuery<string, Order> {
  async execute(id: string): Promise<IResult<Order, string>> {
    return this.repo.findById(id);
  }
}
```

---

## API Reference

### Core API

#### ID

```typescript
// Create
ID.create(); // new UUID — isNew() → true
ID.create("existing-id"); // from value — isNew() → false
ID.short(); // 16-char short ID — isNew() → true
ID.short("existing-id"); // short from value — isNew() → false

// Read
id.value(); // string value
id.isNew(); // true if auto-generated
id.isShort(); // true if 16 chars

// Compare
id.isEqual(other); // value equality
id.deepEqual(other); // deep JSON equality

// Clone
id.clone(); // same value, isNew() → false
id.cloneAsNew(); // same value, isNew() → true
id.createdAt(); // Date this ID instance was created
```

#### Value Object

```typescript
// Factory
MyVO.create(props)  // → IResult<MyVO> — safe, does not throw
MyVO.isValid(props) // → boolean — alias for isValidProps()
MyVO.init(props)    // → MyVO — throws DomainError if invalid (useful only for testing or seeding, prefer `.create()` instead.)

// Read
vo.get('key')      // read a property
vo.get('value')    // read primitive VOs (string, number, etc.)
vo.getRaw()        // frozen snapshot of all props
vo.toObject()      // serialized plain object (deeply frozen)
vo.toObject(adapter) // serialized via Adapter or IAdapter

// Compare & Clone
vo.isEqual(other)  // structural equality by value
vo.clone(props?)   // new instance, optionally with overrides

// Override in subclass
static isValidProps(props): boolean  // construction validation
validation(value, key): boolean      // per-key invariant on change()
```

#### Entity

```typescript
// Factory
MyEntity.create(props)  // → IResult<MyEntity> — safe, does not throw
MyEntity.init(props)    // → MyEntity — throws DomainError if invalid
MyEntity.isValid(props) // → boolean

// Identity
entity.id          // UID<string>
entity.id.value()  // UUID string
entity.isNew()     // true if id was auto-generated
entity.hashCode()  // '[Entity@ClassName]:uuid'

// Read
entity.get('key')    // read a property (throws if getters disabled or key missing)
entity.getRaw()      // frozen snapshot of all props
entity.toObject()    // serialized plain object
entity.toObject(adapter)

// Mutate (each refreshes updatedAt)
entity.set('key').to(value, validation?)  // fluent setter
entity.change('key', value, validation?)  // direct setter

// Compare & Clone
entity.isEqual(other)   // same class + same id + same props
entity.clone(props?)    // new instance with same id, optionally with overrides
```

#### Aggregate

Inherits all Entity API, plus:

```typescript
// Emit a domain event (inside domain methods)
this.emit({ type: 'event:name', payload: { ... } })
this.emit(new MyDomainEvent(...))  // BaseDomainEvent subclass

// Event queue
aggregate.eventCount      // number of pending events
aggregate.peekEvents()    // ReadonlyArray<DomainEvent> — inspect without draining
aggregate.pullEvents()    // ReadonlyArray<DomainEvent> — drains the queue
aggregate.clearEvents()   // discard all pending events; returns count cleared

// Clone (events not copied by default)
aggregate.clone(props?)                  // without events
aggregate.clone({ ...props, withEvents: true }) // carry events over

aggregate.hashCode() // '[Aggregate@ClassName]:uuid'
```

#### Repository

```typescript
abstract class BaseRepository<T extends Entity, ID = UID> {
  abstract findById(id: ID): Promise<IResult<T, string>>;
  abstract save(entity: T): Promise<IResult<void, string>>;
  abstract delete(id: ID): Promise<IResult<void, string>>;
  abstract exists(id: ID): Promise<boolean>;
}
```

#### Adapters

```typescript
// Synchronous — implement adaptOne (and optionally adaptMany)
interface Adapter<A, B> {
  adaptOne(item: A): B;
  adaptMany?(items: A[]): B[];
}

// Result-wrapped — implement build
interface IAdapter<F, T, E = void, M = void> {
  build(target: F): IResult<T, E, M>;
}

// Usage
entity.toObject(new MyAdapter());
```

### Helpers

#### Result

`Result<T, E, M>` is a typed monad for representing operation outcomes — eliminating uncontrolled `throw` in domain and application code.

```typescript
// Create
Result.success(); // void success
Result.success(value); // success with payload
Result.success(value, meta); // success with payload + metadata
Result.error("message"); // failure with error
Result.error("message", meta); // failure with metadata

// Inspect
result.isSuccess(); // boolean
result.isError(); // boolean
result.isNull(); // true if void success or failure
result.value(); // T | null
result.error(); // E | null
result.metaData(); // M

// Combine multiple results — fails at first failure
Result.combine([r1, r2, r3]); // → IResult

// Iterate results
Result.iterate([r1, r2, r3]); // → IIterator<IResult>

// Execute a command conditionally
result.execute(command).on("success");
result.execute(command).withData(data).on("error");

// Serialize
result.toObject();
// { isSuccess, isError, data, error, metaData }
```

#### DomainClasses

Fluent builder for creating multiple domain instances in a batch. The combined `result` fails if any single entry fails.

```typescript
const { result, data } = DomainClasses.prepare(Name, { value: "Alice" })
  .prepare(Email, { value: "alice@example.com" })
  .prepare(Age, { value: 30 })
  .create();

if (result.isSuccess()) {
  const name = data.next().value() as Name;
  const email = data.next().value() as Email;
  const age = data.next().value() as Age;
}
```

#### DomainError

Structured domain error with `field` and `context` metadata. Thrown automatically by the library when invariants are violated; throw it manually from your domain methods.

```typescript
throw new DomainError("Amount must be positive", {
  field: "amount", // the prop that caused the violation
  context: "Money", // the domain class where it originated
});
// Message: '[Money] Amount must be positive'
// error.field   → 'amount'
// error.context → 'Money'
```

Thrown automatically by:

- `set().to()` / `change()` — validation fails or setters disabled
- `get()` — getters disabled or key missing
- `Entity` constructor — props is not a plain object
- `init()` — `isValidProps()` returns `false`
- Event managers — event name missing `context:EventName` format

#### Iterator

Bi-directional sequential traversal over a collection.

```typescript
// Create
Iterator.create({ initialData, restartOnFinish?, returnCurrentOnReversion? })

// Navigate
iter.next()     // move forward, return item
iter.prev()     // move backward, return item
iter.hasNext()  // boolean
iter.hasPrev()  // boolean
iter.first()    // peek first item (no cursor move)
iter.last()     // peek last item (no cursor move)
iter.toFirst()  // reset cursor to before first item
iter.toLast()   // reset cursor to after last item

// Mutate
iter.add(item)          // alias for addToEnd
iter.addToEnd(item)
iter.addToStart(item)   // resets cursor
iter.removeFirst()
iter.removeLast()
iter.removeItem(item)   // by JSON equality, adjusts cursor
iter.clear()

// Export
iter.toArray()   // copy as plain array
iter.clone()     // new Iterator with same items and config
iter.total()     // item count
iter.isEmpty()   // boolean
```

#### Validators & Utils

Built-in `validator` and `util` instances inherited by all domain classes, accessible as both instance and static members.

**Type guards:**

```typescript
this.validator.isString(v)     this.validator.isNumber(v)
this.validator.isBoolean(v)    this.validator.isDate(v)
this.validator.isNull(v)       this.validator.isUndefined(v)
this.validator.isArray(v)      this.validator.isObject(v)   // plain objects only
this.validator.isFunction(v)   this.validator.isSymbol(v)
this.validator.isID(v)         this.validator.isEntity(v)
this.validator.isAggregate(v)  this.validator.isValueObject(v)
```

**String checks:** `hasLengthBetweenOrEqual(min, max)` · `hasLengthGreaterThan(n)` · `hasLengthLessOrEqualTo(n)` · `hasLengthEqualTo(n)` · `isEmpty()` · `hasSpecialChar()` · `hasOnlyNumbers()` · `hasOnlyLetters()` · `match(regex)` · `isEqual(str)` · `includes(str)`

**Number checks:** `isPositive()` · `isNegative()` · `isGreaterThan(n)` · `isGreaterOrEqualTo(n)` · `isLessThan(n)` · `isLessOrEqualTo(n)` · `isBetween(min, max)` · `isBetweenOrEqual(min, max)` · `isEqualTo(n)` · `isInteger()` · `isSafeInteger()` · `isEven()`

**Date checks:** `isAfterNow()` · `isBeforeNow()` · `isAfterThan(d)` · `isAfterOrEqualTo(d)` · `isBeforeThan(d)` · `isBeforeOrEqualTo(d)` · `isBetween(start, end)` · `isWeekend()`

**Date utils:** `util.date(d).add(n).days/weeks/months/hours/minutes()` · `util.date(d).subtract(n).days/weeks/months/hours/minutes()`

**Number utils** (floating-point safe): `util.number(n).sum(v)` · `.subtract(v)` · `.multiplyBy(v)` · `.divideBy(v, { fractionDigits? })`

**String utils:** `util.string(s).removeSpaces()` · `.removeNumbers()` · `.removeSpecialChars()` · `.removeChar(c)` · `.replace(c).to(v)`

### Event System

The Event System is a **standalone, portable package** — completely decoupled from your domain model. The `Aggregate` only collects events via `emit()`; it has no awareness of how those events get delivered.

```
Aggregate (emits) ──→ pullEvents() ──→ [ Your Transport ]
                                               │
                           ┌───────────────────┼──────────────────────┐
                           ▼                   ▼                      ▼
                        EventBus          Redis / Kafka          Custom IEventBus
                     (in-process)       (distributed)             (anything)
```

#### Domain Event

Domain events record what happened inside an aggregate boundary. They are plain, serializable data with no handlers and no side effects.

```typescript
// DomainEvent shape
interface DomainEvent<TPayload = unknown> {
  readonly type: string; // 'order:placed' — required
  readonly aggregateId?: string; // auto-filled by emit()
  readonly aggregateName?: string; // auto-filled by emit()
  readonly occurredAt?: Date; // auto-filled by emit()
  readonly payload?: TPayload;
}
```

> **Naming convention:** past-tense, `aggregate:fact` — e.g. `order:placed`, `user:email-changed`, `payment:failed`.

**Inline style** (recommended for most cases):

```typescript
this.emit({ type: "order:placed", payload: { total: 100, customerId: "c-1" } });
```

**OOP style** — `BaseDomainEvent` (when you need `instanceof` checks or reusability):

```typescript
class OrderPlacedEvent extends BaseDomainEvent<OrderPlacedPayload> {
  static readonly type = "order:placed" as const;

  constructor(aggregateId: string, payload: OrderPlacedPayload) {
    super(OrderPlacedEvent.type, aggregateId, "Order", payload);
  }
}

// Then, in your aggregate
this.emit(
  new OrderPlacedEvent(this.id.value(), { total: 100, customerId: "c-1" }),
);

// Subscriber
if (event instanceof OrderPlacedEvent) {
  /* ... */
}
```

#### Event Bus

`EventBus` is the built-in in-process pub-sub. Zero config, works in Node.js and browsers.

```typescript
const bus = new EventBus();

bus.subscribe("order:placed", async (event) => {
  /* ... */
});

await repo.save(order);
await bus.publishAll(order.pullEvents());
```

| Method                  | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `subscribe(type, fn)`   | Register a subscriber for an event type                  |
| `unsubscribe(type)`     | Remove all subscribers for a type; returns count removed |
| `publish(event)`        | Publish a single event                                   |
| `publishAll(events)`    | Publish an ordered array of events                       |
| `subscriberCount(type)` | Count subscribers for a type                             |
| `clear()`               | Remove all subscribers                                   |

Multiple subscribers for the same type run independently. Errors are collected and re-thrown as a single `AggregateError` after all subscribers have run.

**Bring your own transport** — implement `IEventBus`:

```typescript
class RedisEventBus implements IEventBus {
  async publish(event: DomainEvent): Promise<void> {
    await redis.xadd(event.type, "*", "data", JSON.stringify(event));
  }
  async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
    for (const event of events) await this.publish(event);
  }
}

const bus: IEventBus = new RedisEventBus();
await bus.publishAll(order.pullEvents()); // no domain code changes needed
```

#### Event Context

For platform-native dispatch (browser `CustomEvent` or Node.js `EventEmitter`), `EventContext` auto-detects the runtime and returns the appropriate manager:

```typescript
const manager = EventContext.resolve();
// → ServerEventManager in Node.js / Bun / Deno
// → BrowserEventManager in browsers
```

**`ServerEventManager`** — Node.js singleton backed by `EventEmitter`:

```typescript
const manager = ServerEventManager.instance();
manager.subscribe("user:registered", handler);
manager.dispatchEvent("user:registered", payload);
manager.exists("user:registered"); // true
manager.removeEvent("user:registered"); // true
```

**`BrowserEventManager`** — Browser singleton backed by `CustomEvent`, with `sessionStorage` persistence:

```typescript
const manager = BrowserEventManager.instance(window);
manager.subscribe("cart:item-added", handler);
manager.dispatchEvent("cart:item-added", { productId: "p-1" });
```

Both managers support **wildcard dispatch**:

```typescript
manager.dispatchEvent("order:*"); // dispatches all events matching 'order:*'
```

> **Event name format:** all managers require `context:EventName` format (e.g. `order:placed`). A `DomainError` is thrown on invalid names.

---

## CLI Reference

### info

Display CLI version and a full command reference.

```bash
npx domion info
```

### init

Initialize the library in your project.

```bash
npx domion init        # interactive
npx domion init -y     # skip all prompts
```

**What it does:**

1. Copies library source files into `src/lib/domion`
2. Creates `domion.config.ts` in your project root
3. Prepares your project for generators

**Flags:**

| Flag | Description                    |
| ---- | ------------------------------ |
| `-y` | Skip all prompts, use defaults |

### list

List all available code generators.

```bash
npx domion list
```

```
Available generators:

• entity        → Domain entity with identity and lifecycle
• value-object  → Immutable value object
• aggregate     → Aggregate root with domain events
• repository    → Repository contract/implementation
• use-case      → Application use case (command/query)
```

### generate

Generate a domain building block from a template.

```bash
npx domion generate                                         # fully interactive
npx domion generate <type> --name=<Name>                    # with type and name
npx domion generate <type> --name=<Name> --target=<t>       # resolve path from config
npx domion generate <type> --name=<Name> --location=<path>  # explicit path
```

**Examples:**

```bash
# Generate with an explicit output path
npx domion generate entity --name=User --location=src/modules/user/domain/entities

# Generate using a predefined target from domion.config.ts
npx domion generate value-object --name=Email --target=user

# Generate using aliases
npx domion generate entity -n=User -l=src/modules/user/domain/entities
npx domion generate entity -n User -l src/modules/user/domain/entities
npx domion generate value-object -n Email -t user

# Fully interactive — prompts for type, name, and destination
npx domion generate
```

**Flags:**

| Flag         | Alias | Description                                                   |
| ------------ | ----- | ------------------------------------------------------------- |
| `--name`     | `-n`  | Name of the class to generate (auto-normalized to PascalCase) |
| `--target`   | `-t`  | Use a predefined path from `targets` in `domion.config.ts`    |
| `--location` | `-l`  | Manually specify the output directory                         |

**Name normalization:**

All names are automatically normalized to **PascalCase** for class usage. The CLI confirms before generating:

| Input          | Normalized    |
| -------------- | ------------- |
| `user`         | `User`        |
| `user profile` | `UserProfile` |
| `user_profile` | `UserProfile` |
| `UserProfile`  | `UserProfile` |

### sync

Update the library source files to the latest version.

```bash
npx domion sync     # interactive
npx domion sync -f  # force overwrite — no prompts, no backup
```

When a new version is detected, you are prompted:

```
A new version of library kernel is available.

What do you want to do?

1. Overwrite existing files
2. Skip update
3. Backup current version and install new
```

Choosing option 3 moves your current files to:

```
src/lib/domion/__backup__/vX.X.X
```

This way, you can safely resolve your own changes to the newest version available.

> ⚠️ Add the backup directory to `.gitignore`:
>
> ```
> src/lib/domion/__backup__/
> ```

**Flags:**

| Flag      | Alias | Description                                  |
| --------- | ----- | -------------------------------------------- |
| `--force` | `-f`  | Overwrite everything — no prompts, no backup |

### uninstall

Uninstall the library completely.

```bash
npx domion uninstall
```

This will locate both the config file and the library directory if exists and
remove it. So you can still remove the config file or library directory manually.

---

## Roadmap

- [ ] Template presets for common Value Objects
- [ ] Better sync diffing for resolving sync changes

---

## License

Licensed under the MIT License.
