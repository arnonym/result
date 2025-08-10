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

type ExpectMessage<E> = string | ((err: E) => string);

interface Functions<O, E> {
    isOk: () => this is Ok<O>;
    isErr: () => this is Err<E>;
    map: <NO>(fn: (value: O) => NO) => Result<NO, E>;
    andThen: <F extends Result<any, any>>(fn: (value: O) => F) => Result<Success<F>, E | Failure<F>>;
    mapErr: <NE>(fn: (err: E) => NE) => Result<O, NE>;
    unwrap: () => O;
    unwrapErr: () => E;
    expect: (message: ExpectMessage<E>) => O;
    unwrapOr: <R1>(def: R1) => O | R1;
    unwrapOrElse: <R1>(def: (err: E) => R1) => O | R1;
    or: <R1>(def: R1) => Ok<O | R1>;
    orElse: <R1>(def: (err: E) => R1) => Ok<O | R1>;
    match: <R1, R2>(m: Match<O, E, R1, R2>) => R1 | R2;
    [Symbol.iterator](): Iterator<GenResult<O, E>, GenSuccess<GenResult<O, E>>>;
}

export type Ok<O> = {
    readonly _isOk: true;
    readonly value: O;
} & Functions<O, never>;

export type Err<E> = {
    readonly _isOk: false;
    readonly err: E;
} & Functions<never, E>;

//export type Result<O, E> = [E] extends [never] ? Ok<O> : [O] extends [never] ? Err<E> : Ok<O> | Err<E>;
export type Result<O, E> = [O] extends [never] ? Err<E> : [E] extends [never] ? Ok<O> : Ok<O> | Err<E>;
//export type Result<O, E> = Ok<O> | Err<E>;

export type Success<T extends Result<any, any>> = T extends Ok<infer O> ? O : never;
export type Failure<T extends Result<any, any>> = T extends Err<infer E> ? E : never;

export type GenResult<O, E> = (E extends never ? never : Err<E>) | O;
export type GenFailure<T extends GenResult<any, any>> = T extends Err<infer E> ? E : never;
export type GenSuccess<T extends GenResult<any, any>> = T extends Err<any> ? never : T;

export interface Match<O, E, R1, R2> {
    ok(value: O): R1;
    err(error: E): R2;
}

function map<O, NO, E>(fn: (value: O) => NO): (data: Result<O, E>) => Result<NO, E> {
    return data => {
        if (data.isOk()) {
            return asOk(fn(data.value)) as Result<NO, E>;
        } else {
            return data as unknown as Result<NO, E>;
        }
    };
}

function andThen<O, E, F extends Result<any, any>>(
    fn: (value: O) => F,
): (data: Result<O, E>) => Result<Success<F>, E | Failure<F>> {
    return (data: Result<O, E>) => {
        if (data.isOk()) {
            return fn(data.value) as unknown as Result<Success<F>, E | Failure<F>>;
        }
        return data as unknown as Result<Success<F>, E | Failure<F>>;
    };
}

function match<O, E, R1, R2>(m: Match<O, E, R1, R2>): (data: Result<O, E>) => R1 | R2 {
    return data => (data.isOk() ? m.ok(data.value) : m.err(data.err));
}

function mapErr<O, E, NE>(fn: (err: E) => NE): (data: Result<O, E>) => Result<O, NE> {
    return data => {
        if (data.isErr()) {
            return asErr(fn(data.err)) as Result<O, NE>;
        } else {
            return data as unknown as Result<O, NE>;
        }
    };
}

function unwrap<O, E>(data: Result<O, E>): O {
    if (data.isOk()) {
        return data.value;
    }
    throw data.err;
}

function unwrapErr<O, E>(data: Result<O, E>): E {
    if (data.isErr()) {
        return data.err;
    }
    throw new Error(`Tried to unwrapErr on value: ${data.value}`);
}

function expect<O, E>(message: ExpectMessage<E>): (data: Result<O, E>) => O {
    return data => {
        if (data.isOk()) {
            return data.value;
        }
        const m = typeof message === 'function' ? message(data.err) : message;
        throw new Error(m);
    };
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

function or<R1>(def: R1): <O, E>(data: Result<O, E>) => Ok<O | R1> {
    return data => {
        return data.isOk() ? data : asOk(def);
    };
}

function orElse<R1, E>(def: (err: E) => R1): <O>(data: Result<O, E>) => Ok<O | R1> {
    return data => {
        return data.isOk() ? data : asOk(def(data.err));
    };
}

class InternalResult<
    IS_OK extends boolean,
    O extends IS_OK extends true ? unknown : never,
    E extends IS_OK extends false ? unknown : never,
> implements Functions<O, E>
{
    constructor(
        public readonly _isOk: IS_OK,
        public readonly value: IS_OK extends true ? O : undefined,
        public readonly err: IS_OK extends false ? E : undefined,
    ) {}

    isOk(): this is Ok<O> {
        return this._isOk;
    }

    isErr(): this is Err<E> {
        return !this._isOk;
    }

    map<NO>(fn: (value: O) => NO): Result<NO, E> {
        return map<O, NO, E>(fn)(this as unknown as Result<O, E>);
    }

    andThen<F extends Result<any, any>>(fn: (value: O) => F): Result<Success<F>, E | Failure<F>> {
        return andThen<O, E, F>(fn)(this as unknown as Result<O, E>);
    }

    mapErr<NE>(fn: (err: E) => NE) {
        return mapErr<O, E, NE>(fn)(this as unknown as Result<O, E>);
    }

    unwrap() {
        return unwrap<O, E>(this as unknown as Result<O, E>);
    }

    unwrapErr() {
        return unwrapErr<O, E>(this as unknown as Result<O, E>);
    }

    expect(message: ExpectMessage<E>) {
        return expect<O, E>(message)(this as unknown as Result<O, E>);
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

export function assertOk<O, E>(result: Ok<O> | Err<E>): asserts result is Ok<O> {
    if (!result._isOk) {
        throw new Error(`Expected Ok, got Err: ${result.err}`);
    }
}

export function assertErr<O, E>(result: Ok<O> | Err<E>): asserts result is Err<E> {
    if (result._isOk) {
        throw new Error(`Expected Err, got Ok: ${result.value}`);
    }
}

function asOk<O>(value: O): Ok<O> {
    return new InternalResult(true, value, undefined);
}

function asErr<E>(err: E): Err<E> {
    return new InternalResult(false, undefined, err);
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
        return item as Result<O, E>;
    }
    return asOk(result) as Result<O, E>;
}

function tryException<T>(fn: () => T): Result<T, unknown> {
    try {
        return asOk(fn()) as Result<T, unknown>;
    } catch (e) {
        return asErr(e);
    }
}

async function tryPromise<T>(fn: () => Promise<T>): Promise<Result<T, unknown>> {
    return fn()
        .then(v => asOk(v) as Result<T, unknown>)
        .catch(e => asErr(e) as Result<T, unknown>);
}

function handle<Self, E extends GenResult<any, any>, F>(
    ...args: [self: Self, fn: (this: Self) => Generator<E, F>] | [fn: () => Generator<E, F>]
): Result<F, GenFailure<E>> {
    const fn = args.length === 1 ? args[0] : args[1].bind(args[0]);
    const iter = fn();
    let current = iter.next();
    while (current.done !== true) {
        if ((current.value as Result<any, any>).isErr()) {
            return current.value as unknown as Result<F, GenFailure<E>>;
        }
        current = iter.next((current.value as Ok<any>).value);
    }
    return asOk(current.value) as Result<F, GenFailure<E>>;
}

async function handleAsync<Self, E extends GenResult<any, any>, F>(
    ...args: [self: Self, fn: (this: Self) => AsyncGenerator<E, F>] | [fn: () => AsyncGenerator<E, F>]
): Promise<Result<F, GenFailure<E>>> {
    const fn = args.length === 1 ? args[0] : args[1].bind(args[0]);
    const iter = fn();
    let current = await iter.next();
    while (current.done !== true) {
        if ((current.value as Result<any, any>).isErr()) {
            return current.value as unknown as Result<F, GenFailure<E>>;
        }
        current = await iter.next((current.value as Ok<any>).value);
    }
    return asOk(current.value) as Result<F, GenFailure<E>>;
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
