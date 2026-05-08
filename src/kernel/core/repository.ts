import type { Entity } from "../core/entity";
import type { IEntityProps } from "../types/entity.types";
import type { IResult } from "../types/result.types";
import type { UID } from "../types/uid.types";

/**
 * @description
 * Abstract base class defining the standard contract for a domain repository.
 *
 * A repository abstracts the persistence layer, allowing domain code to remain
 * ignorant of storage details. Each aggregate root should have its own repository
 * implementation.
 *
 * Only the methods defined here are guaranteed by the contract. Implementations
 * may expose additional query methods specific to their aggregate.
 *
 * @template T The entity or aggregate type managed by this repository.
 * @template ID The type of the entity's identifier. Defaults to `string`.
 *
 * @example
 * ```typescript
 * class UserRepository extends BaseRepository<User> {
 *     async findById(id: string): Promise<IResult<User, string>> {
 *         const row = await db.users.findOne({ id });
 *         if (!row) return Result.error('User not found');
 *         return User.create(row);
 *     }
 *
 *     async save(user: User): Promise<IResult<void, string>> {
 *         await db.users.upsert(user.toObject());
 *         return Result.success();
 *     }
 *
 *     async delete(id: string): Promise<IResult<void, string>> {
 *         await db.users.delete({ id });
 *         return Result.success();
 *     }
 *
 *     async exists(id: string): Promise<boolean> {
 *         return db.users.exists({ id });
 *     }
 * }
 * ```
 */
export abstract class BaseRepository<T extends Entity<IEntityProps>, ID = UID> {
	/**
	 * @description
	 * Finds an entity by its unique identifier.
	 *
	 * @param id The entity's unique identifier.
	 * @returns A `Result` containing the entity if found, or an error if not.
	 */
	abstract findById(id: ID): Promise<IResult<T | null, string>>;

	/**
	 * @description
	 * Persists an entity — either inserting or updating as appropriate.
	 *
	 * @param entity The entity instance to save.
	 * @returns A `Result` indicating success or failure.
	 */
	abstract save(entity: T): Promise<IResult<void, string>>;

	/**
	 * @description
	 * Removes an entity by its unique identifier.
	 *
	 * @param id The unique identifier of the entity to delete.
	 * @returns A `Result` indicating success or failure.
	 */
	abstract delete(id: ID): Promise<IResult<void, string>>;

	/**
	 * @description
	 * Checks whether an entity with the given identifier exists in the store.
	 *
	 * @param id The unique identifier to check.
	 * @returns `true` if the entity exists; `false` otherwise.
	 */
	abstract exists(id: ID): Promise<boolean>;
}
