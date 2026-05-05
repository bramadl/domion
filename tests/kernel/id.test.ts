import { describe, expect, test } from "bun:test";
import { ID } from "../../src/kernel/core/id";

describe("[Core] ID", () => {
  describe("Static Factories", () => {
    describe("ID.create()", () => {
      test("generates a UUID and marks it as new when called with no argument", () => {
        const id = ID.create();

        expect(id.value()).toBeString();
        expect(id.isNew()).toBe(true);
        expect(id.createdAt()).toBeValidDate();
      });

      test("wraps a provided string value and does NOT mark it as new", () => {
        const id = ID.create("pokemon-1");

        expect(id.value()).toBe("pokemon-1");
        expect(id.isNew()).toBe(false);
        expect(id.createdAt()).toBeValidDate();
      });

      test("wraps a provided number value, casts it to string, and does NOT mark it as new", () => {
        const id = ID.create(1011001);

        expect(id.value()).toBe("1011001");
        expect(id.isNew()).toBe(false);
      });

      test("throws TypeError when the provided value is a boolean", () => {
        expect(() => ID.create(true as unknown as string)).toThrow(TypeError);
      });

      test("throws TypeError when the provided value is a plain object", () => {
        expect(() => ID.create({} as unknown as string)).toThrow(TypeError);
      });

      test("throws TypeError when the provided value is an array", () => {
        expect(() => ID.create([] as unknown as string)).toThrow(TypeError);
      });

      test("throws TypeError when the provided value is a Date", () => {
        expect(() => ID.create(new Date() as unknown as string)).toThrow(TypeError);
      });
    });

    describe("ID.short()", () => {
      test("generates a 16-byte short ID and marks it as new when called with no argument", () => {
        const id = ID.short();

        expect(id.value()).toBeString();
        expect(id.value().length).toBe(16);
        expect(id.isNew()).toBe(true);
        expect(id.isShort()).toBe(true);
      });

      test("creates a short ID from a provided string value and does NOT mark it as new", () => {
        const id = ID.short("pokemon-1");

        expect(id.value()).toBeString();
        expect(id.value().length).toBe(16);
        expect(id.isNew()).toBe(false);
        expect(id.isShort()).toBe(true);
      });
    });
  })

  describe("Instance Methods", () => {
    describe("id.clone()", () => {
      test("returns a copy with the same value", () => {
        const id = ID.create("some-id");
        const cloned = id.clone();

        expect(cloned.value()).toBe("some-id");
      });

      test("the copy is NOT marked as new regardless of the original", () => {
        const freshId = ID.create();        
        const existingId = ID.create("x"); 

        expect(freshId.clone().isNew()).toBe(false);
        expect(existingId.clone().isNew()).toBe(false);
      });

      test("the copy is equal to the original by value", () => {
        const id = ID.create("some-id");
        const cloned = id.clone();

        expect(id.isEqual(cloned)).toBe(true);
        expect(cloned.isEqual(id)).toBe(true);
      });
    });

    describe("id.cloneAsNew()", () => {
      test("returns a copy with the same value", () => {
        const id = ID.create("some-id");
        const cloned = id.cloneAsNew();

        expect(cloned.value()).toBe("some-id");
      });

      test("the copy IS marked as new", () => {
        const id = ID.create("some-id");
        const cloned = id.cloneAsNew();

        expect(cloned.isNew()).toBe(true);
      });

      test("the copy is equal to the original by value", () => {
        const id = ID.create("some-id");
        const cloned = id.cloneAsNew();

        expect(id.isEqual(cloned)).toBe(true);
        expect(cloned.isEqual(id)).toBe(true);
      });
    });

    describe("id.toShort()", () => {
      test("shortens a full UUID to exactly 16 characters and preserves isNew", () => {
        const id = ID.create(); 

        expect(id.isShort()).toBe(false);

        id.toShort();

        expect(id.value().length).toBe(16);
        expect(id.isShort()).toBe(true);
        expect(id.isNew()).toBe(true);
      });

      test("shortens an existing-value ID and preserves isNew = false", () => {
        const id = ID.create("pokemon-1"); 

        expect(id.isShort()).toBe(false);

        id.toShort();

        expect(id.value().length).toBe(16);
        expect(id.isShort()).toBe(true);
        expect(id.isNew()).toBe(false);
      });

      test("prepends a UUID when the value is shorter than 16 chars before shortening", () => {
        const id = ID.create("xy");

        id.toShort();

        expect(id.value().length).toBe(16);
        expect(id.isShort()).toBe(true);
      });
    });

    describe("id.createdAt()", () => {
      test("returns a valid Date on a freshly created ID", () => {
        const before = new Date();
        const id = ID.create();
        const after = new Date();

        expect(id.createdAt()).toBeValidDate();
        expect(id.createdAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(id.createdAt().getTime()).toBeLessThanOrEqual(after.getTime());
      });

      test("returns a valid Date on a value-initialized ID", () => {
        const id = ID.create("pokemon-1");

        expect(id.createdAt()).toBeValidDate();
      });
    });

    describe("id.isShort()", () => {
      test("returns false for a full UUID", () => {
        const id = ID.create();

        expect(id.isShort()).toBe(false);
      });

      test("returns true for a 16-byte ID", () => {
        const id = ID.short();

        expect(id.isShort()).toBe(true);
      });
    });

    describe("id.equal() / id.isEqual()", () => {
      test("equal() returns true when both IDs share the same value", () => {
        const a = ID.create("abc");
        const b = ID.create("abc");

        expect(a.equal(b)).toBe(true);
      });

      test("equal() returns false when the values differ", () => {
        const a = ID.create("abc");
        const b = ID.create("xyz");

        expect(a.equal(b)).toBe(false);
      });

      test("isEqual() is an alias for equal() — same results", () => {
        const a = ID.create("abc");
        const b = ID.create("abc");
        const c = ID.create("xyz");

        expect(a.isEqual(b)).toBe(true);
        expect(a.isEqual(c)).toBe(false);
      });
    });

    describe("id.deepEqual()", () => {
      test("returns true for two IDs with the same value and metadata", () => {
        const id = ID.create("pokemon-1");
        const cloned = id.clone();

        expect(id.deepEqual(cloned)).toBe(true);
        expect(cloned.deepEqual(id)).toBe(true);
      });

      test("returns false when the values differ", () => {
        const a = ID.create("abc");
        const b = ID.create("xyz");

        expect(a.deepEqual(b)).toBe(false);
      });

      test("returns false between clone() and cloneAsNew() — isNew differs", () => {
        const id = ID.create("pokemon-1");
        const regularClone = id.clone();    
        const newClone = id.cloneAsNew();   

        expect(regularClone.deepEqual(newClone)).toBe(false);
      });
    });

    describe("id.value()", () => {
      test("returns the raw string value", () => {
        expect(ID.create("pikachu").value()).toBe("pikachu");
      });

      test("numeric input is returned as a string", () => {
        expect(ID.create(42).value()).toBe("42");
      });
    });
  })
});