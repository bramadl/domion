import { describe, expect, test } from "bun:test";
import { type Adapter, type IAdapter, Result, type UID } from "../../../src/kernel";
import { DomainError } from "../../../src/kernel/helpers/domain-error";
import { Entity } from "../../../src/kernel/core/entity";
import { ID } from "../../../src/kernel/core/id";
import { ValueObject } from "../../../src/kernel/core/value-object";

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
			User.validator.isObject(props) &&
			!User.validator.isNull(props) &&
			User.validator.isString(props.name) &&
			!User.validator.string(props.name).isEmpty()
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
			Admin.validator.isObject(props) && Admin.validator.isString(props.name)
		);
	}
}

interface ToolProps {
	name: string;
}

class Tool extends Entity<ToolProps> {
	private constructor(props: ToolProps) {
		super(props);
	}
}

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 2));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("[Core] Entity", () => {
	describe("Constructor Guard", () => {
		test("throws DomainError when props is null", () => {
			expect(() => User.init(null as unknown as UserProps)).toThrow(
				DomainError,
			);
		});

		test("throws DomainError when props is an array", () => {
			expect(() => User.init([] as unknown as UserProps)).toThrow(DomainError);
		});

		test("throws DomainError when props is a Date", () => {
			expect(() => User.init(new Date() as unknown as UserProps)).toThrow(
				DomainError,
			);
		});

		test("throws DomainError when props is a primitive", () => {
			expect(() => User.init("string" as unknown as UserProps)).toThrow(
				DomainError,
			);
		});
	});

	describe("Static Factories", () => {
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
	});

	describe("Validation Helpers", () => {
		describe("Entity.isValidProps()", () => {
			test("uses default Entity class — valid props return true", () => {
				expect(Tool.isValidProps({ name: "PokePulse" })).toBe(true);
			});

			test("delegates to subclass override — valid props return true", () => {
				expect(
					User.isValidProps({
						name: "Ash",
						profile: { city: "Pallet", level: 1 },
					}),
				).toBe(true);
			});

			test("delegates to subclass override — invalid props return false", () => {
				expect(
					User.isValidProps({
						name: "",
						profile: { city: "Pallet", level: 1 },
					}),
				).toBe(false);
			});

			test("rejects null via base implementation", () => {
				expect(User.isValidProps(null as unknown as UserProps)).toBe(false);
			});
		});

		describe("Entity.isValid()", () => {
			test("is an alias for isValidProps — returns true for valid props", () => {
				expect(
					User.isValid({ name: "Ash", profile: { city: "Pallet", level: 1 } }),
				).toBe(true);
			});

			test("is an alias for isValidProps — returns false for invalid props", () => {
				expect(User.isValid(null)).toBe(false);
			});
		});
	});

	describe("Instance Methods", () => {
		describe("entity.id", () => {
			test("auto-generates a new UID when no id is provided", () => {
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

			test("restores a string ID from props and marks it as NOT new", () => {
				const user = User.create({
					id: "user-1",
					name: "Misty",
					profile: { city: "Cerulean", level: 2 },
				}).value();

				expect(user.id.value()).toBe("user-1");
				expect(user.id.isNew()).toBe(false);
				expect(user.isNew()).toBe(false);
			});

			test("restores a numeric ID from props and casts it to string", () => {
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

		describe("entity.get()", () => {
			test("returns user-defined prop values", () => {
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
		});

		describe("entity.getRaw()", () => {
			test("returns a frozen snapshot of all props", () => {
				const user = User.create({
					name: "Ash",
					profile: { city: "Pallet", level: 1 },
				}).value();
				const raw = user.getRaw();

				expect(raw.name).toBe("Ash");
				expect(Object.isFrozen(raw)).toBe(true);
			});
		});

		describe("entity timestamps", () => {
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

				expect((user.get("updatedAt") as Date).getTime()).toBeGreaterThan(
					before,
				);
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

		describe("entity.change() / entity.set().to()", () => {
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

			test("change() with a failing validation function throws DomainError and leaves props unchanged", () => {
				const user = User.init({
					name: "Ash",
					profile: { city: "Pallet", level: 1 },
				});

				expect(() =>
					user.change("name", "", (v) => v.trim().length > 0),
				).toThrow(DomainError);
				expect(user.get("name")).toBe("Ash");
			});

			test("changing 'id' updates both the internal _id and the resolved string value", () => {
				const user = User.init({
					name: "Ash",
					profile: { city: "Pallet", level: 1 },
				});
				user.change("id", "new-id" as unknown as string);

				expect(user.id.value()).toBe("new-id");
				expect(user.get("id")).toBe("new-id");
			});
		});

		describe("entity.clone()", () => {
			test("returns a new instance of the same subclass", () => {
				const user = User.init({
					name: "Ash",
					profile: { city: "Pallet", level: 1 },
				});
				const cloned = user.clone();

				expect(cloned).toBeInstanceOf(User);
				expect(cloned).not.toBe(user);
			});

			test("inherits the original id when no id override is provided", () => {
				const user = User.init({
					id: "u-1",
					name: "Ash",
					profile: { city: "Pallet", level: 1 },
				});
				const cloned = user.clone();

				expect(cloned.id.value()).toBe("u-1");
			});

			test("uses the overridden id when provided", () => {
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

			test("mutations on the clone do not affect the original", () => {
				const user = User.init({
					name: "Ash",
					profile: { city: "Pallet", level: 1 },
				});
				const cloned = user.clone();
				cloned.change("name", "Clone");

				expect(user.get("name")).toBe("Ash");
			});
		});

		describe("entity.isEqual()", () => {
			test("two entities with the same id and same props are equal", () => {
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

			test("two entities with the same id but different props are not equal", () => {
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

			test("two entities with different ids are not equal, even with the same props", () => {
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

			test("entities of different subclasses with the same id are NOT equal (critical DDD rule)", () => {
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

				expect(user.isEqual(admin as unknown as User)).toBe(false);
			});

			test("returns false when other is null", () => {
				const user = User.init({
					name: "Ash",
					profile: { city: "Pallet", level: 1 },
				});

				expect(user.isEqual(null as unknown as User)).toBe(false);
			});

			test("returns false when other is undefined", () => {
				const user = User.init({
					name: "Ash",
					profile: { city: "Pallet", level: 1 },
				});

				expect(user.isEqual(undefined as unknown as User)).toBe(false);
			});

			test("timestamps are excluded from the equality comparison", async () => {
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

				expect(a.isEqual(b)).toBe(true);
			});
		});

		describe("entity.hashCode()", () => {
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

		describe("entity.toObject()", () => {
			test("serializes flat props to a plain object including id and timestamps", () => {
				const user = User.create({
					id: "u-1",
					name: "Ash",
					profile: { city: "Pallet", level: 1 },
				}).value();
				const obj = user.toObject() as Record<string, unknown>;

				expect(obj.id).toBe("u-1");
				expect(obj.name).toBe("Ash");
				expect(obj.createdAt).toBeInstanceOf(Date);
				expect(obj.updatedAt).toBeInstanceOf(Date);
			});

			test("recursively serializes nested entities, VOs, and UID props", () => {
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

			test("returns a deeply frozen result", () => {
				const user = User.create({
					name: "Ash",
					profile: { city: "Pallet", level: 1 },
				}).value();

				expect(Object.isFrozen(user.toObject())).toBe(true);
			});

			test("uses Adapter.adaptOne when an Adapter is provided", () => {
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

			test("uses IAdapter.build when an IAdapter is provided", () => {
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
	});
});
