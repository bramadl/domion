/**
 * @description
 * Represents the static side (constructor + factory contract) of a `ValueObject` subclass.
 *
 * @template Props The shape of the value object's properties.
 * @template T The concrete `ValueObject` subclass type.
 */
export type ValueObjectConstructor<Props, T> = {
	isValidProps(props: Props): boolean;
	readonly name: string;
	prototype: T;
};

/**
 * @description
 * Configuration for value object settings.
 */
export interface IValueObjectSettings {
	disableGetters?: boolean;
}
