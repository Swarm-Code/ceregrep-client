declare module 'lodash' {
  export function last<T>(array?: ArrayLike<T> | null): T | undefined;
  export function isArray(value: any): value is any[];
  export function isObject(value: any): boolean;
  export function forEach<T>(
    collection: T[] | object | null | undefined,
    iteratee?: (value: any, key: any, collection: any) => any,
  ): T[] | object;
  export function map<T, R>(
    collection: T[] | object | null | undefined,
    iteratee?: (value: T, key: any, collection: any) => R,
  ): R[];
  export function filter<T>(
    collection: T[] | object | null | undefined,
    predicate?: (value: T, key: any, collection: any) => boolean,
  ): T[];
  export function reduce<T, R>(
    collection: T[] | object | null | undefined,
    iteratee: (accumulator: R, value: T, key: any, collection: any) => R,
    accumulator?: R,
  ): R;
  export function some<T>(
    collection: T[] | object | null | undefined,
    predicate?: (value: T, key: any, collection: any) => boolean,
  ): boolean;
  export function every<T>(
    collection: T[] | object | null | undefined,
    predicate?: (value: T, key: any, collection: any) => boolean,
  ): boolean;
  export function find<T>(
    collection: T[] | object | null | undefined,
    predicate?: (value: T, key: any, collection: any) => boolean,
  ): T | undefined;
  export function includes<T>(
    collection: T[] | string | object | null | undefined,
    value: T,
    fromIndex?: number,
  ): boolean;
}
