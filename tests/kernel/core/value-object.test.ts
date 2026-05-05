import { describe, expect, test } from "bun:test";
import { type Adapter, type IAdapter, Result, type UID } from "../../../src/kernel";
import { DomainError } from "../../../src/kernel/helpers/domain-error";
import { ID } from "../../../src/kernel/core/id";
import { ValueObject } from "../../../src/kernel/core/value-object";

// ─── Fixtures ────────────────────────────────────────────────────────────────

interface AgeProps {
	value: number;
}

class Age extends ValueObject<AgeProps> {
	private constructor(props: AgeProps) {
		super(props);
	}

	public static override isValidProps(props: AgeProps): boolean {
		return (
			Age.validator.isObject(props) &&
			!Age.validator.isNull(props) &&
			Age.validator.isNumber(props.value) &&
			Age.validator.number(props.value).isGreaterOrEqualTo(0)
		);
	}
}

interface MoneyProps {
	amount: number;
	currency: string;
}

class Money extends ValueObject<MoneyProps> {
	private constructor(props: MoneyProps) {
		super(props);
	}

	public static override isValidProps(props: MoneyProps): boolean {
		return (
			Money.validator.isObject(props) &&
			!Money.validator.isNull(props) &&
			Money.validator.isNumber(props.amount) &&
			Money.validator.isString(props.currency)
		);
	}
}

class NestedValue extends ValueObject<{
	meta: { name: string; power: number };
}> {
	constructor(props: { meta: { name: string; power: number } }) {
		super(props);
	}
}

class StringVO extends ValueObject<string> {
	constructor(value: string) {
		super(value);
	}
}

class DateVO extends ValueObject<Date> {
	constructor(value: Date) {
		super(value);
	}
}

class SymbolVO extends ValueObject<symbol> {
	constructor(value: symbol) {
		super(value);
	}
}

class IdVO extends ValueObject<UID<string>> {
	constructor(value: UID<string>) {
		super(value);
	}
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("[Core] ValueObject", () => {
	describe("Static Factories", () => {
		describe("ValueObject.create()", () => {
			test("returns success when props are valid", () => {
				const result = Age.create({ value: 10 });

				expect(result.isSuccess()).toBe(true);
				expect(result.value()).toBeInstanceOf(Age);
			});

			test("returns error when props are invalid", () => {
				const result = Age.create({ value: -1 });

				expect(result.isError()).toBe(true);
			});

			test("error message contains the subclass name", () => {
				const result = Age.create({ value: -1 });

				expect(result.error()).toContain("Age");
			});

			test("base isValidProps rejects null", () => {
				const result = NestedValue.create(
					null as unknown as { meta: { name: string; power: number } },
				);

				expect(result.isError()).toBe(true);
			});

			test("base isValidProps rejects undefined", () => {
				const result = NestedValue.create(
					undefined as unknown as { meta: { name: string; power: number } },
				);

				expect(result.isError()).toBe(true);
			});
		});

		describe("ValueObject.init()", () => {
			test("returns instance directly when props are valid", () => {
				const age = Age.init({ value: 5 });

				expect(age).toBeInstanceOf(Age);
				expect(age.get("value")).toBe(5);
			});

			test("throws DomainError when props are invalid", () => {
				expect(() => Age.init({ value: -1 })).toThrow(DomainError);
			});

			test("error contains the subclass name", () => {
				expect(() => Age.init({ value: -1 })).toThrow(/Age/);
			});
		});
	});

	describe("Validation Helpers", () => {
		describe("ValueObject.isValidProps()", () => {
			test("delegates to subclass override — valid props return true", () => {
				expect(Age.isValidProps({ value: 0 })).toBe(true);
			});

			test("delegates to subclass override — invalid props return false", () => {
				expect(Age.isValidProps({ value: -1 })).toBe(false);
			});

			test("rejects null via base implementation", () => {
				expect(Age.isValidProps(null as unknown as AgeProps)).toBe(false);
			});
		});

		describe("ValueObject.isValid()", () => {
			test("is an alias for isValidProps — returns true for valid props", () => {
				expect(Age.isValid({ value: 1 })).toBe(true);
			});

			test("is an alias for isValidProps — returns false for invalid props", () => {
				expect(Age.isValid({ value: -1 })).toBe(false);
			});
		});
	});

	describe("Instance Methods", () => {
		describe("vo.get()", () => {
			test("returns value for object-shaped props", () => {
				const age = Age.create({ value: 42 }).value();

				expect(age.get("value")).toBe(42);
			});

			test("returns primitive props via the 'value' key", () => {
				const vo = StringVO.init("hello");

				expect(vo.get("value")).toBe("hello");
			});
		});

		describe("vo.getRaw()", () => {
			test("returns a frozen snapshot of the raw props", () => {
				const age = Age.create({ value: 10 }).value();
				const raw = age.getRaw();

				expect(raw).toEqual({ value: 10 });
				expect(Object.isFrozen(raw)).toBe(true);
			});
		});

		describe("vo.change() / vo.set().to() — setters disabled", () => {
			test("change() throws DomainError — setters are disabled by default on ValueObjects", () => {
				const age = Age.create({ value: 10 }).value();

				expect(() => age.change("value", 11)).toThrow(DomainError);
			});

			test("set().to() throws DomainError — setters are disabled by default on ValueObjects", () => {
				const age = Age.create({ value: 10 }).value();

				expect(() => age.set("value").to(11)).toThrow(DomainError);
			});

			test("props remain unchanged after a failed mutation attempt", () => {
				const age = Age.create({ value: 10 }).value();

				try {
					age.change("value", 99);
				} catch {
					/* expected */
				}

				expect(age.get("value")).toBe(10);
			});
		});

		describe("vo.clone()", () => {
			test("returns a new instance of the same subclass", () => {
				const age = Age.create({ value: 10 }).value();
				const cloned = age.clone({ value: 20 });

				expect(cloned).toBeInstanceOf(Age);
				expect(cloned).not.toBe(age);
			});

			test("overrides only the provided props, preserving the rest", () => {
				const money = Money.create({ amount: 100, currency: "USD" }).value();
				const converted = money.clone({ amount: 200 });

				expect(converted.get("amount")).toBe(200);
				expect(converted.get("currency")).toBe("USD");
			});

			test("original is not mutated after clone", () => {
				const age = Age.create({ value: 10 }).value();
				age.clone({ value: 99 });

				expect(age.get("value")).toBe(10);
			});

			test("clone of primitive props returns identical value", () => {
				const vo = StringVO.init("hello");
				const cloned = vo.clone();

				expect(cloned.get("value")).toBe("hello");
				expect(cloned).not.toBe(vo);
			});

			test("clone of Date props returns a new instance with the same timestamp", () => {
				const d = new Date("2026-01-01T00:00:00.000Z");
				const vo = DateVO.init(d);
				const cloned = vo.clone();

				expect(cloned.get("value")).toEqual(d);
				expect(cloned).not.toBe(vo);
			});
		});

		describe("vo.isEqual()", () => {
			test("two VOs with same object props are equal", () => {
				const a = Age.create({ value: 10 }).value();
				const b = Age.create({ value: 10 }).value();

				expect(a.isEqual(b)).toBe(true);
			});

			test("two VOs with different object props are not equal", () => {
				const a = Age.create({ value: 10 }).value();
				const b = Age.create({ value: 20 }).value();

				expect(a.isEqual(b)).toBe(false);
			});

			test("two VOs with the same primitive (string) props are equal", () => {
				const a = StringVO.init("hello");
				const b = StringVO.init("hello");

				expect(a.isEqual(b)).toBe(true);
			});

			test("two VOs with different primitive props are not equal", () => {
				const a = StringVO.init("hello");
				const b = StringVO.init("world");

				expect(a.isEqual(b)).toBe(false);
			});

			test("two VOs with the same Date props are equal", () => {
				const a = DateVO.init(new Date("2026-01-01T00:00:00.000Z"));
				const b = DateVO.init(new Date("2026-01-01T00:00:00.000Z"));

				expect(a.isEqual(b)).toBe(true);
			});

			test("two VOs with different Date props are not equal", () => {
				const a = DateVO.init(new Date("2026-01-01"));
				const b = DateVO.init(new Date("2027-01-01"));

				expect(a.isEqual(b)).toBe(false);
			});

			test("two VOs with the same UID props are equal", () => {
				const a = IdVO.init(ID.create("abc"));
				const b = IdVO.init(ID.create("abc"));

				expect(a.isEqual(b)).toBe(true);
			});

			test("two VOs with different UID props are not equal", () => {
				const a = IdVO.init(ID.create("abc"));
				const b = IdVO.init(ID.create("xyz"));

				expect(a.isEqual(b)).toBe(false);
			});

			test("two VOs with the same symbol props are equal", () => {
				const s = Symbol("role");
				const a = SymbolVO.init(s);
				const b = SymbolVO.init(s);

				expect(a.isEqual(b)).toBe(true);
			});

			test("two VOs with the same nested object props are equal", () => {
				const a = new NestedValue({ meta: { name: "Pikachu", power: 55 } });
				const b = new NestedValue({ meta: { name: "Pikachu", power: 55 } });

				expect(a.isEqual(b)).toBe(true);
			});

			test("two VOs with different nested object props are not equal", () => {
				const a = new NestedValue({ meta: { name: "Pikachu", power: 55 } });
				const b = new NestedValue({ meta: { name: "Raichu", power: 90 } });

				expect(a.isEqual(b)).toBe(false);
			});

			test("VOs of different subclasses with structurally similar props are not equal", () => {
				const age = Age.create({ value: 10 }).value();
				const money = Money.create({ amount: 10, currency: "USD" }).value();

				expect(age.isEqual(money as unknown as Age)).toBe(false);
			});
		});

		describe("vo.toObject()", () => {
			test("serializes object props to a plain object", () => {
				const age = Age.create({ value: 10 }).value();

				expect(age.toObject()).toEqual({ value: 10 });
			});

			test("serializes nested object props correctly", () => {
				const nested = new NestedValue({
					meta: { name: "Pikachu", power: 55 },
				});

				expect(nested.toObject()).toEqual({
					meta: { name: "Pikachu", power: 55 },
				});
			});

			test("returns a deeply frozen object for object props", () => {
				const nested = new NestedValue({
					meta: { name: "Pikachu", power: 55 },
				});
				const result = nested.toObject();

				expect(Object.isFrozen(result)).toBe(true);
				expect(Object.isFrozen((result as { meta: object }).meta)).toBe(true);
			});

			test("mutation on the frozen result throws", () => {
				const nested = new NestedValue({
					meta: { name: "Pikachu", power: 55 },
				});
				const result = nested.toObject() as { meta: { name: string } };

				expect(() => {
					result.meta.name = "Raichu";
				}).toThrow();
			});

			test("returns primitive value as-is without freezing", () => {
				const vo = StringVO.init("hello");

				expect(vo.toObject()).toBe("hello");
			});

			test("uses Adapter.adaptOne when an Adapter is provided", () => {
				const age = Age.create({ value: 10 }).value();
				const adapter: Adapter<Age, { age: number }> = {
					adaptOne: (vo) => ({ age: vo.get("value") }),
				};

				expect(age.toObject(adapter)).toEqual({ age: 10 });
			});

			test("uses IAdapter.build when an IAdapter is provided", () => {
				const age = Age.create({ value: 10 }).value();
				const adapter: IAdapter<Age, { age: number }> = {
					build: (vo) => Result.success({ age: vo.get("value") }),
				};

				expect(age.toObject(adapter)).toEqual({ age: 10 });
			});
		});
	});
});
