/* eslint-disable @typescript-eslint/no-explicit-any */
import { SingleTimeGenerator } from './single-time-generator';

export type GetOkays<T extends Array<Result<any, any>>> = {
    [K in keyof T]: T[K] extends Result<infer O, any> ? (O extends Err<any> ? never : O) : never;
};

export type GetErrors<T extends Array<Result<any, any>>> = {
    [K in keyof T]: T[K] extends Result<any, infer E> ? (E extends Ok<any> ? never : E) : never;
};

type IncludesType<T extends Array<unknown>, S> = {
    [I in keyof T]: T[I] extends never ? unknown : never;
}[number] extends S
    ? false
    : true;

export type NeverIfExistingInUnion<T extends Array<unknown>> = IncludesType<T, never> extends true ? never : T;

interface Functions<O, E> {
    isOk: () => this is Ok<O>;
    isErr: () => this is Err<E>;
    map: <NO>(fn: (value: O) => NO) => Result<NO, E>;
    andThen: <NO, NE>(fn: (value: O) => Result<NO, NE>) => Result<NO, E | NE>;
    mapErr: <NE>(fn: (err: E) => NE) => Result<O, NE>;
    unwrap: () => O;
    unwrapOr: <R1>(def: R1) => O | R1;
    unwrapOrElse: <R1>(def: (err: E) => R1) => O | R1;
    or: <R1>(def: R1) => Result<O | R1, never>;
    orElse: <R1>(def: (err: E) => R1) => Result<O | R1, never>;
    match: <R1, R2>(m: Match<O, E, R1, R2>) => R1 | R2;
    [Symbol.iterator](): Iterator<GenResult<O, E>, GenSuccess<GenResult<O, E>>>;
}

export type Ok<O> = {
    readonly _ok: true;
    readonly value: O;
} & Functions<O, never>;

export type Err<E> = {
    readonly _ok: false;
    readonly err: E;
} & Functions<never, E>;

export type Result<O, E> = Ok<O> | Err<E>;
export type Success<T extends Result<any, any>> = T extends Ok<infer O> ? O : never;
export type Failure<T extends Result<any, any>> = T extends Err<infer E> ? E : never;

export type GenResult<O, E> = (E extends never ? never : Err<E>) | O;
export type GenFailure<T extends GenResult<any, any>> = T extends Err<infer E> ? E : never;
export type GenSuccess<T extends GenResult<any, any>> = T extends Err<any> ? never : T;

export interface Match<O, E, R1, R2> {
    ok(value: O): R1;
    err(error: E): R2;
}

function map<O, NO>(fn: (value: O) => NO): <E>(data: Result<O, E>) => Result<NO, E> {
    return data => {
        return data.isOk() ? asOk(fn(data.value)) : data;
    };
}

function andThen<O, NO, E, NE>(fn: (value: O) => Result<NO, NE>): (data: Result<O, E>) => Result<NO, NE | E> {
    return (data: Result<O, E>) => {
        return data.isOk() ? fn(data.value) : data;
    };
}

function match<O, E, R1, R2>(m: Match<O, E, R1, R2>): (data: Result<O, E>) => R1 | R2 {
    return data => (data.isOk() ? m.ok(data.value) : m.err(data.err));
}

function mapErr<O, E, NE>(fn: (err: E) => NE): (data: Result<O, E>) => Result<O, NE> {
    return data => {
        return data.isErr() ? asErr(fn(data.err)) : data;
    };
}

function unwrap<O, E>(data: Result<O, E>): O {
    if (data.isOk()) {
        return data.value;
    }
    throw new Error(`Tried to unwrap error: ${data.err}`);
}

function unwrapOr<R1>(def: R1): <O, E>(data: Result<O, E>) => O | R1 {
    return data => {
        return data.isOk() ? data.value : def;
    };
}

function unwrapOrElse<E, R1>(def: (err: E) => R1): <O>(data: Result<O, E>) => O | R1 {
    return data => {
        return data.isOk() ? data.value : def(data.err);
    };
}

function or<R1>(def: R1): <O, E>(data: Result<O, E>) => Result<O | R1, never> {
    return data => {
        return data.isOk() ? data : asOk(def);
    };
}

function orElse<R1, E>(def: (err: E) => R1): <O>(data: Result<O, E>) => Result<O | R1, never> {
    return data => {
        return data.isOk() ? data : asOk(def(data.err));
    };
}

class InternalResult<O, E> implements Functions<O, E> {
    constructor(
        private readonly _isOk: boolean,
        public readonly value: O | undefined,
        public readonly err: E | undefined,
    ) {}

    isOk(): this is Ok<O> {
        return this._isOk;
    }

    isErr(): this is Err<E> {
        return !this._isOk;
    }

    map<NO>(fn: (value: O) => NO): Result<NO, E> {
        return map<O, NO>(fn)(this as unknown as Result<O, E>);
    }

    andThen<NO, NE>(fn: (value: O) => Result<NO, NE>): Result<NO, E | NE> {
        return andThen<O, NO, E, NE>(fn)(this as unknown as Result<O, E>);
    }

    mapErr<NE>(fn: (err: E) => NE) {
        return mapErr<O, E, NE>(fn)(this as unknown as Result<O, E>);
    }

    unwrap() {
        return unwrap<O, E>(this as unknown as Result<O, E>);
    }

    unwrapOr<R1>(def: R1) {
        return unwrapOr<R1>(def)(this as unknown as Result<O, E>);
    }

    unwrapOrElse<R1>(def: (err: E) => R1) {
        return unwrapOrElse<E, R1>(def)(this as unknown as Result<O, E>);
    }

    or<R1>(def: R1) {
        return or<R1>(def)(this as unknown as Result<O, E>);
    }

    orElse<R1>(def: (err: E) => R1) {
        return orElse<R1, E>(def)(this as unknown as Result<O, E>);
    }

    match<R1, R2>(m: Match<O, E, R1, R2>) {
        return match<O, E, R1, R2>(m)(this as unknown as Result<O, E>);
    }

    [Symbol.iterator] = () =>
        new SingleTimeGenerator<GenResult<O, E>, GenSuccess<GenResult<O, E>>>(
            this as unknown as GenSuccess<GenResult<O, E>>,
        );
}

export function assertOk<O, E>(result: Result<O, E>): asserts result is Result<O, never> {
    if (result.isErr()) {
        throw new Error(`Expected Ok, got Err: ${result.err}`);
    }
}

function assertErr<O, E>(result: Result<O, E>): asserts result is Result<never, E> {
    if (result.isOk()) {
        throw new Error(`Expected Err, got Ok: ${result.value}`);
    }
}

function asOk<O, E extends never>(value: O): Result<O, E> {
    return new InternalResult(true, value, undefined) as unknown as Result<O, never>;
}

function asErr<E, O extends never>(err: E): Result<O, E> {
    return new InternalResult(false, undefined, err) as unknown as Result<never, E>;
}

function all<
    T extends Array<Result<unknown, unknown>>,
    O = NeverIfExistingInUnion<GetOkays<T>>,
    E = GetErrors<T>[number],
>(...list: T): Result<O, E> {
    const result = [];
    for (const item of list) {
        if (item.isOk()) {
            result.push(item.value);
            continue;
        }
        return item as Result<never, E>;
    }
    return asOk(result) as Result<O, never>;
}

function tryException<T>(fn: () => T): Result<T, unknown> {
    try {
        return asOk(fn());
    } catch (e) {
        return asErr(e);
    }
}

async function tryPromise<T>(fn: () => Promise<T>): Promise<Result<T, unknown>> {
    return fn()
        .then(v => asOk(v))
        .catch(e => asErr(e));
}

function handle<Self, E extends GenResult<any, any>, F>(
    ...args: [self: Self, fn: (this: Self) => Generator<E, F>] | [fn: () => Generator<E, F>]
): Result<F, GenFailure<E>> {
    const fn = args.length === 1 ? args[0] : args[1].bind(args[0]);
    const iter = fn();
    let current = iter.next();
    while (current.done !== true) {
        if ((current.value as Result<any, any>).isErr()) {
            return current.value as unknown as Result<never, GenFailure<E>>;
        }
        current = iter.next((current.value as Ok<any>).value);
    }
    return asOk(current.value) as unknown as Result<F, never>;
}

async function handleAsync<Self, E extends GenResult<any, any>, F>(
    ...args: [self: Self, fn: (this: Self) => AsyncGenerator<E, F>] | [fn: () => AsyncGenerator<E, F>]
): Promise<Result<F, GenFailure<E>>> {
    const fn = args.length === 1 ? args[0] : args[1].bind(args[0]);
    const iter = fn();
    let current = await iter.next();
    while (current.done !== true) {
        if ((current.value as Result<any, any>).isErr()) {
            return current.value as unknown as Result<never, GenFailure<E>>;
        }
        current = await iter.next((current.value as Ok<any>).value);
    }
    return asOk(current.value) as unknown as Result<F, never>;
}

export const Result: {
    ok: typeof asOk;
    err: typeof asErr;
    all: typeof all;
    try: typeof tryException;
    tryPromise: typeof tryPromise;
    handle: typeof handle;
    handleAsync: typeof handleAsync;
    assertOk: typeof assertOk;
    assertErr: typeof assertErr;

    map: typeof map;
    andThen: typeof andThen;
    mapErr: typeof mapErr;
    unwrap: typeof unwrap;
    unwrapOr: typeof unwrapOr;
    unwrapOrElse: typeof unwrapOrElse;
    or: typeof or;
    orElse: typeof orElse;
    match: typeof match;
} = {
    ok: asOk,
    err: asErr,
    all,
    try: tryException,
    tryPromise,
    handle,
    handleAsync,
    assertOk,
    assertErr,

    map,
    andThen,
    mapErr,
    unwrap,
    unwrapOr,
    unwrapOrElse,
    or,
    orElse,
    match,
};
