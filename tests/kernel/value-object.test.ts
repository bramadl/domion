import { describe, expect, test } from "bun:test";
import { DomainError } from "../../src/kernel/helpers/domain-error";
import { ID } from "../../src/kernel/core/id";
import { ValueObject } from "../../src/kernel/core/value-object";
import { Result, type Adapter, type IAdapter, type UID } from "../../src/kernel";

interface AgeProps {
	value: number;
}

class Age extends ValueObject<AgeProps> {
	constructor(props: AgeProps) {
		super(props);
	}

	public static override isValidProps(props: unknown): boolean {
		return (
      this.validator.isObject(props) &&
      !this.validator.isNull(props) &&
			"value" in props &&
      this.validator.isNumber(props.value) &&
      this.validator.number(props.value).isGreaterOrEqualTo(0)
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

describe("ValueObject", () => {
	test("uses subclass validation in base create", () => {
		const valid = Age.create({ value: 10 });
		const invalid = Age.create({ value: -1 });

		expect(valid.isSuccess()).toBe(true);
		expect(invalid.isError()).toBe(true);
		expect(invalid.error()).toContain("Age");
	});

	test("disables setters by default", () => {    
		const age = Age.create({ value: 10 }).value();

		expect(() => age.change("value", 11)).toThrow(DomainError);
		expect(() => age.set("value").to(11)).toThrow(DomainError);
		expect(age.get("value")).toBe(10);
	});

	test("clones into a new instance", () => {
		const age = Age.create({ value: 10 }).value();
		const older = age.clone({ value: 11 });

		expect(older).toBeInstanceOf(Age);
		expect(older).not.toBe(age);
		expect(older.get("value")).toBe(11);
		expect(age.get("value")).toBe(10);
	});

	test("compares primitive, ID, date, and nested object values", () => {
		const idA = new (class extends ValueObject<UID> {
			constructor() {
				super(ID.create("same"));
			}
		})();
		const idB = new (class extends ValueObject<UID> {
			constructor() {
				super(ID.create("same"));
			}
		})();
		const dateA = new (class extends ValueObject<Date> {
			constructor() {
				super(new Date("2026-01-01T00:00:00.000Z"));
			}
		})();
		const dateB = new (class extends ValueObject<Date> {
			constructor() {
				super(new Date("2026-01-01T00:00:00.000Z"));
			}
		})();

		const ageA = Age.create({ value: 10 }).value();
		const ageB = Age.create({ value: 10 }).value();

		expect(ageA.isEqual(ageB)).toBe(true);
		expect(idA.isEqual(idB)).toBe(true);
		expect(dateA.isEqual(dateB)).toBe(true);
		expect(
			new NestedValue({ meta: { name: "Pikachu", power: 55 } }).isEqual(
				new NestedValue({ meta: { name: "Pikachu", power: 55 } }),
			),
		).toBe(true);
		expect(
			new NestedValue({ meta: { name: "Pikachu", power: 55 } }).isEqual(
				new NestedValue({ meta: { name: "Raichu", power: 90 } }),
			),
		).toBe(false);
	});

  test("serializes value object to plain object (default)", () => {
    const age = Age.create({ value: 10 }).value();
    const result = age.toObject();

    expect(result).toEqual({ value: 10 });
  });

  test("returns deeply frozen object for object props", () => {
    const nested = new NestedValue({
      meta: { name: "Pikachu", power: 55 },
    });

    const result = nested.toObject();

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.meta)).toBe(true);

    expect(() => {
      (result as any).meta.name = "Raichu";
    }).toThrow();
  });

  test("returns primitive value as-is without freezing", () => {
    class StringVO extends ValueObject<string> {
      constructor(value: string) {
        super(value);
      }
    }

    const vo = new StringVO("hello");
    const result = vo.toObject();

    expect(result).toBe("hello");
  });

  test("uses Adapter.adaptOne when provided", () => {
    const age = Age.create({ value: 10 }).value();

    const adapter: Adapter<Age, { age: number }> = {
      adaptOne: (vo) => ({ age: vo.get("value") }),
    };

    const result = age.toObject(adapter);

    expect(result).toEqual({ age: 10 });
  });

  test("uses IAdapter.build when provided", () => {
    const age = Age.create({ value: 10 }).value();

    const adapter: IAdapter<Age, { age: number }> = {
      build: (vo) => Result.success({ age: vo.get("value") }),
    };

    const result = age.toObject(adapter);

    expect(result).toEqual({ age: 10 });
  });

  test("serializes nested value objects correctly", () => {
    const nested = new NestedValue({
      meta: { name: "Pikachu", power: 55 },
    });

    const result = nested.toObject();

    expect(result).toEqual({
      meta: { name: "Pikachu", power: 55 },
    });
  });
});
