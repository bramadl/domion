import { describe, expect, test } from "bun:test";
import { DomainError } from "../../src/kernel/helpers/domain-error";
import { ID } from "../../src/kernel/core/id";
import { Entity } from "../../src/kernel/core/entity";
import { ValueObject } from "../../src/kernel/core/value-object";
import type { UID } from "../../src/kernel";
import type { Adapter, IAdapter } from "../../src/kernel";
import { Result } from "../../src/kernel";

// ─── Fixtures ────────────────────────────────────────────────────────────────

class Email extends ValueObject<{ value: string }> {
	protected constructor(props: { value: string }) {
		super(props);
	}
}

interface UserProps {
	name: string;
	profile: {
		city: string;
		level: number;
	};
	email?: Email;
	friend?: User;
	externalId?: UID<string>;
}

class User extends Entity<UserProps> {
	private constructor(props: UserProps) {
		super(props);
	}

	public static override isValidProps(props: UserProps): boolean {
		return (
			this.validator.isObject(props) &&
			!this.validator.isNull(props) &&
			"name" in props &&
			this.validator.isString(props.name) &&
      !this.validator.string(props.name).isEmpty()
		);
	}
}


interface AdminProps {
	name: string;
	profile: { city: string; level: number };
}

class Admin extends Entity<AdminProps> {
	private constructor(props: AdminProps) {
		super(props);
	}

	public static override isValidProps(props: AdminProps): boolean {
		return (
			this.validator.isObject(props) &&
			"name" in props &&
			this.validator.isString(props.name)
		);
	}
}

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 2));

// ─── Constructor guard ────────────────────────────────────────────────────────

describe("Entity constructor guard", () => {
	test("throws DomainError for null props", () => {
		expect(() => User.init(null as unknown as UserProps)).toThrow(DomainError);
	});

	test("throws DomainError for array props", () => {
		expect(() => User.init([] as unknown as UserProps)).toThrow(DomainError);
	});

	test("throws DomainError for Date props", () => {
		expect(
			() => User.init(new Date() as unknown as UserProps),
		).toThrow(DomainError);
	});

	test("throws DomainError for primitive props", () => {
		expect(() => User.init("string" as unknown as UserProps)).toThrow(
			DomainError,
		);
	});
});

// ─── Factory: create() ───────────────────────────────────────────────────────

describe("Entity.create()", () => {
	test("returns success when props are valid", () => {
		const result = User.create({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});

		expect(result.isSuccess()).toBe(true);
		expect(result.value()).toBeInstanceOf(User);
	});

	test("returns error when props fail subclass validation", () => {
		const result = User.create({
			name: "",
			profile: { city: "Pallet", level: 1 },
		});

		expect(result.isError()).toBe(true);
	});

	test("error message contains the subclass name", () => {
		const result = User.create({
			name: "",
			profile: { city: "Pallet", level: 1 },
		});

		expect(result.error()).toContain("User");
	});

	test("returns error for null props", () => {
		const result = User.create(null as unknown as UserProps);

		expect(result.isError()).toBe(true);
	});

	test("returns error for undefined props", () => {
		const result = User.create(undefined as unknown as UserProps);

		expect(result.isError()).toBe(true);
	});
});

// ─── Factory: init() ─────────────────────────────────────────────────────────

describe("Entity.init()", () => {
	test("returns instance directly when props are valid", () => {
		const user = User.init({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});

		expect(user).toBeInstanceOf(User);
		expect(user.get("name")).toBe("Ash");
	});

	test("throws DomainError when props are invalid", () => {
		expect(() =>
			User.init({ name: "", profile: { city: "Pallet", level: 1 } }),
		).toThrow(DomainError);
	});

	test("error contains the subclass name", () => {
		expect(() =>
			User.init({ name: "", profile: { city: "Pallet", level: 1 } }),
		).toThrow(/User/);
	});
});

// ─── Validation helpers ───────────────────────────────────────────────────────

describe("Entity.isValidProps() / isValid()", () => {
	test("isValidProps delegates to subclass override", () => {
		expect(User.isValidProps({ name: "Ash", profile: { city: "Pallet", level: 1 } })).toBe(true);
		expect(User.isValidProps({ name: "", profile: { city: "Pallet", level: 1 } })).toBe(false);
		expect(User.isValidProps(null as unknown as UserProps)).toBe(false);
	});

	test("isValid is an alias for isValidProps", () => {
		expect(User.isValid({ name: "Ash", profile: { city: "Pallet", level: 1 } })).toBe(true);
		expect(User.isValid(null)).toBe(false);
	});
});

// ─── ID management ───────────────────────────────────────────────────────────

describe("Entity ID", () => {
	test("auto-generates a new ID when none is provided", () => {
		const user = User.create({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		}).value();

		expect(user.id.value()).toBeTypeOf("string");
		expect(user.id.value().length).toBeGreaterThan(0);
	});

	test("id.isNew() is true for auto-generated IDs", () => {
		const user = User.create({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		}).value();

		expect(user.id.isNew()).toBe(true);
		expect(user.isNew()).toBe(true);
	});

	test("restores a string ID from props", () => {
		const user = User.create({
			id: "user-1",
			name: "Misty",
			profile: { city: "Cerulean", level: 2 },
		}).value();

		expect(user.id.value()).toBe("user-1");
		expect(user.id.isNew()).toBe(false);
		expect(user.isNew()).toBe(false);
	});

	test("restores a numeric ID from props", () => {
		const user = User.create({
			id: 42,
			name: "Brock",
			profile: { city: "Pewter", level: 3 },
		}).value();

		expect(user.id.value()).toBe("42");
		expect(user.isNew()).toBe(false);
	});

	test("restores a UID instance from props", () => {
		const uid = ID.create("uid-abc");
		const user = User.create({
			id: uid,
			name: "Gary",
			profile: { city: "Pallet", level: 5 },
		}).value();

		expect(user.id.value()).toBe("uid-abc");
	});

	test("get('id') returns the resolved string value, not a UID object", () => {
		const user = User.create({
			id: "user-99",
			name: "Red",
			profile: { city: "Viridian", level: 10 },
		}).value();

		expect(user.get("id")).toBe("user-99");
		expect(typeof user.get("id")).toBe("string");
	});
});

// ─── Timestamps ──────────────────────────────────────────────────────────────

describe("Entity timestamps", () => {
	test("createdAt and updatedAt are populated on construction", () => {
		const user = User.create({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		}).value();

		expect(user.get("createdAt")).toBeInstanceOf(Date);
		expect(user.get("updatedAt")).toBeInstanceOf(Date);
	});

	test("updatedAt advances after a mutation", async () => {
		const user = User.init({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});
		const before = (user.get("updatedAt") as Date).getTime();

		await wait();
		user.change("name", "Red");

		expect((user.get("updatedAt") as Date).getTime()).toBeGreaterThan(before);
	});

	test("createdAt does not change after a mutation", async () => {
		const user = User.init({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});
		const created = (user.get("createdAt") as Date).getTime();

		await wait();
		user.change("name", "Red");

		expect((user.get("createdAt") as Date).getTime()).toBe(created);
	});
});

// ─── Getters ─────────────────────────────────────────────────────────────────

describe("Entity.get()", () => {
	test("returns user-defined prop value", () => {
		const user = User.create({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		}).value();

		expect(user.get("name")).toBe("Ash");
		expect(user.get("profile")).toEqual({ city: "Pallet", level: 1 });
	});

	test("returns implicit props: id, createdAt, updatedAt", () => {
		const user = User.create({
			id: "u-1",
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		}).value();

		expect(user.get("id")).toBe("u-1");
		expect(user.get("createdAt")).toBeInstanceOf(Date);
		expect(user.get("updatedAt")).toBeInstanceOf(Date);
	});

	test("getRaw() returns frozen snapshot of all props", () => {
		const user = User.create({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		}).value();
		const raw = user.getRaw();

		expect(raw.name).toBe("Ash");
		expect(Object.isFrozen(raw)).toBe(true);
	});
});

// ─── Setters ─────────────────────────────────────────────────────────────────

describe("Entity setters", () => {
	test("change() updates the prop value", () => {
		const user = User.init({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});

		user.change("name", "Red");

		expect(user.get("name")).toBe("Red");
	});

	test("set().to() updates the prop value", () => {
		const user = User.init({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});

		user.set("name").to("Misty");

		expect(user.get("name")).toBe("Misty");
	});

	test("change() with failing validation throws DomainError", () => {
		const user = User.init({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});

		expect(() =>
			user.change("name", "", (v) => v.trim().length > 0),
		).toThrow(DomainError);
		expect(user.get("name")).toBe("Ash");
	});

	test("changing id updates _id and the resolved value", () => {
		const user = User.init({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});

		user.change("id", "new-id" as unknown as string);

		expect(user.id.value()).toBe("new-id");
		expect(user.get("id")).toBe("new-id");
	});
});

// ─── clone() ─────────────────────────────────────────────────────────────────

describe("Entity.clone()", () => {
	test("returns a new instance of the same subclass", () => {
		const user = User.init({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});
		const cloned = user.clone();

		expect(cloned).toBeInstanceOf(User);
		expect(cloned).not.toBe(user);
	});

	test("clone shares the same id when no id override is provided", () => {
		const user = User.init({
			id: "u-1",
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});
		const cloned = user.clone();

		expect(cloned.id.value()).toBe("u-1");
	});

	test("clone uses a new id when id is overridden", () => {
		const user = User.init({
			id: "u-1",
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});
		const cloned = user.clone({ id: "u-2" } as Partial<UserProps>);

		expect(cloned.id.value()).toBe("u-2");
	});

	test("overrides only the specified props", () => {
		const user = User.init({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});
		const cloned = user.clone({ name: "Ash 2nd" });

		expect(cloned.get("name")).toBe("Ash 2nd");
		expect(cloned.get("profile").city).toBe("Pallet");
	});

	test("mutations on clone do not affect the original", () => {
		const user = User.init({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});
		const cloned = user.clone();
		cloned.change("name", "Clone");

		expect(user.get("name")).toBe("Ash");
	});
});

// ─── isEqual() ───────────────────────────────────────────────────────────────

describe("Entity.isEqual()", () => {
	test("two entities with same id and same props are equal", () => {
		const a = User.init({
			id: "same",
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});
		const b = User.init({
			id: "same",
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});

		expect(a.isEqual(b)).toBe(true);
	});

	test("two entities with same id but different props are not equal", () => {
		const a = User.init({
			id: "same",
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});
		const b = User.init({
			id: "same",
			name: "Ash",
			profile: { city: "Viridian", level: 1 },
		});

		expect(a.isEqual(b)).toBe(false);
	});

	test("two entities with different ids are not equal, even with same props", () => {
		const a = User.init({
			id: "id-a",
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});
		const b = User.init({
			id: "id-b",
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});

		expect(a.isEqual(b)).toBe(false);
	});

	test("entities of different classes with the same id are NOT equal (critical DDD rule)", () => {
		const user = User.init({
			id: "shared-id",
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});
		const admin = Admin.init({
			id: "shared-id",
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});

		// Same id, same props — but different aggregate types.
		// Without class-identity check this would incorrectly return true.
		expect(user.isEqual(admin as unknown as User)).toBe(false);
	});

	test("isEqual returns false when other is null", () => {
		const user = User.init({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});

		expect(user.isEqual(null as unknown as User)).toBe(false);
	});

	test("isEqual returns false when other is undefined", () => {
		const user = User.init({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});

		expect(user.isEqual(undefined as unknown as User)).toBe(false);
	});

	test("timestamps are excluded from equality comparison", async () => {
		const a = User.init({
			id: "same",
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});

		await wait();

		const b = User.init({
			id: "same",
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		});

		// createdAt/updatedAt will differ — but isEqual should still be true
		expect(a.isEqual(b)).toBe(true);
	});
});

// ─── hashCode() ──────────────────────────────────────────────────────────────

describe("Entity.hashCode()", () => {
	test("format is [Entity@ClassName]:uuid", () => {
		const user = User.create({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		}).value();

		expect(user.hashCode().value()).toMatch(/^\[Entity@User\]:.+$/);
	});

	test("two different instances produce different hash codes", () => {
		const a = User.create({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		}).value();
		const b = User.create({
			name: "Misty",
			profile: { city: "Cerulean", level: 2 },
		}).value();

		expect(a.hashCode().value()).not.toBe(b.hashCode().value());
	});
});

// ─── toObject() ──────────────────────────────────────────────────────────────

describe("Entity.toObject()", () => {
	test("serializes flat props to plain object with id and timestamps", () => {
		const user = User.create({
			id: "u-1",
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		}).value();
		const result = user.toObject() as Record<string, unknown>;

		expect(result.id).toBe("u-1");
		expect(result.name).toBe("Ash");
		expect(result.createdAt).toBeInstanceOf(Date);
		expect(result.updatedAt).toBeInstanceOf(Date);
	});

	test("serializes nested domain objects and UID props", () => {
		const friend = User.init({
			id: "friend",
			name: "Brock",
			profile: { city: "Pewter", level: 3 },
		});
		const user = User.init({
			id: "user",
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
			email: Email.init({ value: "ash@example.com" }),
			friend,
			externalId: ID.create("external"),
		});

		expect(user.toObject()).toMatchObject({
			id: "user",
			name: "Ash",
			email: { value: "ash@example.com" },
			friend: { id: "friend", name: "Brock" },
			externalId: "external",
		});
	});

	test("returns deeply frozen result", () => {
		const user = User.create({
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		}).value();

		expect(Object.isFrozen(user.toObject())).toBe(true);
	});

	test("uses Adapter.adaptOne when provided", () => {
		const user = User.create({
			id: "u-1",
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		}).value();

		const adapter: Adapter<User, { displayName: string }> = {
			adaptOne: (e) => ({ displayName: e.get("name") }),
		};

		expect(user.toObject(adapter)).toEqual({ displayName: "Ash" });
	});

	test("uses IAdapter.build when provided", () => {
		const user = User.create({
			id: "u-1",
			name: "Ash",
			profile: { city: "Pallet", level: 1 },
		}).value();

		const adapter: IAdapter<User, { displayName: string }> = {
			build: (e) => Result.success({ displayName: e.get("name") }),
		};

		expect(user.toObject(adapter)).toEqual({ displayName: "Ash" });
	});
});