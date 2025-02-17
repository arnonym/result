# @arnonym/result

A `Result` type for TypeScript inspired by Rust.

## Why?

`Result` is a type that represents either success or failure. It is a more explicit way to
handle errors compared with exceptions.

### What are the problems with exceptions?

#### 1. Hidden Control Flow

-   Exceptions disrupt the normal flow of execution, making it harder to understand how a program will behave.

-   Code can jump to a completely different part of the program, leading to unexpected behavior.

#### 2. Lack of Type Safety

-   Unlike function return types, exceptions are untyped in TypeScript.

## Getting started

### Installation

Install using a package manager of your choice (e.g. npm):

```bash
npm install @arnonym/result
```

### Requirements

You need to enable strict mode in your `tsconfig.json`:

```json
{
    "compilerOptions": {
        "strict": true
    }
}
```

### Using `Result`

A typical function using `Result` might look like this:

```typescript
import { Result } from '@arnonym/result';

type Version = 'one' | 'two';

class VersionError extends Error {
    readonly type = 'version';
}

class HeaderSizeError extends Error {
    readonly type = 'header-size';
}

function parseHeaderVersion(header: number[]): Result<Version, VersionError | HeaderSizeError> {
    switch (header[0]) {
        case undefined:
            return Result.err(new HeaderSizeError('Header size mismatch'));
        case 1:
            return Result.ok('one');
        case 2:
            return Result.ok('two');
        default:
            return Result.err(new VersionError('Invalid version'));
    }
}

function parseHeaderLength(header: number[]): Result<number, HeaderSizeError> {
    switch (header[1]) {
        case undefined:
            return Result.err(new HeaderSizeError('Header size mismatch'));
        default:
            return Result.ok(header[1]);
    }
}

const header = [1, 2, 3];
const version = parseHeaderVersion(header);
version.match({
    ok: v => console.log(`Using version: ${v}`),
    err: e => console.error(`Error: ${e.message}`),
});
const headerLength = parseHeaderLength(header);
if (headerLength.isOk()) {
    console.log(`Header length: ${headerLength.value}`);
}
```

### Result.handle

Let's first take a look at this function:

```typescript
function parseHeader(header: number[]): Result<[Version, number], VersionError | HeaderSizeError> {
    const version = parseHeaderVersion(header);
    if (version.isErr()) {
        return version;
    }
    const length = parseHeaderLength(header);
    if (length.isErr()) {
        return length;
    }
    if (length.value !== header.length) {
        return Result.err(new HeaderSizeError('Header size does not match'));
    }
    return Result.ok([version.value, length.value]);
}
```

The `if` statements are a bit noisy and the function is not very readable.

We can use `Result.handle` to make it more concise:

```typescript
function parseHeader(header: number[]): Result<[Version, number], VersionError | HeaderSizeError> {
    return Result.handle(function* () {
        // if parseHeaderVersion returns an error, the computation will stop here
        // and propagate the error to the outer function, otherwise the unwrapped value
        // will be used in the next computation
        const version: Version = yield* parseHeaderVersion(header);
        const length: number = yield* parseHeaderLength(header);
        if (length !== header.length) {
            return yield* Result.err(new HeaderSizeError('Header size does not match'));
        }
        return [version, length];
    });
}
```

This is using a generator function to short-circuit the computation if an error occurs and uses the
`Result`-less value inside the function for further computation. The returned value will be wrapped
in a successful `Result`. Also, the result type reflects all the errors that might occur. Kinda like
the question mark operator in Rust.

And these tests will pass for both functions:

```typescript
const parsedHeader = parseHeader([1, 3, 3]);
expect(parsedHeader.isOk() && parsedHeader.value).toStrictEqual(['one', 3]);

const anotherHeader = parseHeader([3, 2, 1]);
expect(anotherHeader.isErr() && anotherHeader.err.type).toStrictEqual('version');

const yetAnotherHeader = parseHeader([1]);
expect(yetAnotherHeader.isErr() && yetAnotherHeader.err.type).toStrictEqual('header-size');

const moreHeader = parseHeader([1, 5, 3]);
expect(moreHeader.isErr() && moreHeader.err.message).toStrictEqual('Header size does not match');
```

Same goes for `Result.handleAsync` to handle async functions:

```typescript
async function asyncParseHeader(header: number[]): Promise<Result<[Version, number], Error>> {
    return Result.handleAsync(async function* () {
        // These are not async functions, but it's just an example
        const version: Version = yield* await parseHeaderVersion(header);
        const length: number = yield* await parseHeaderLength(header);
        return [version, length];
    });
}
```

### Pipe

You can also use `pipe` to build pipelines:

```typescript
const header = [1, 2];
const result = pipe(
    header,
    parseHeaderLength,
    Result.andThen(length => {
        if (header.length !== length) {
            return Result.err(new HeaderSizeError());
        } else {
            return Result.ok(length);
        }
    }),
);
expect(result).toStrictEqual(Result.ok(2));
```

### Convenience functions

There are also some convenience functions to make working with `Result` easier:

```typescript
// create a Result with a value or an error
const goodResult: Result<number, Error> = Result.ok(10);
const badResult: Result<number, Error> = Result.err(new Error('Something went wrong'));

// isOK and isErr functions do what you expect
expect(goodResult.isOk()).toBe(true);
expect(goodResult.isErr()).toBe(false);
expect(badResult.isErr()).toBe(true);
expect(badResult.isOk()).toBe(false);
// use them to narrow down the type and access value or error
expect(goodResult.isOk() && goodResult.value).toBe(10);
expect(badResult.isErr() && badResult.err.message).toBe('Something went wrong');

// `map` and `mapErr` maps `Result` to another one of same type.
const mappedGoodResult: Result<number, Error> = goodResult.map(i => i + 1);
const mappedBadResult: Result<number, Error> = badResult.mapErr(e => new Error(e.message + " and I can't fix it"));
expect(mappedGoodResult.isOk() && mappedGoodResult.value).toEqual(11);
expect(mappedBadResult.isErr() && mappedBadResult.err.message).toBe("Something went wrong and I can't fix it");

// Use `andThen` to continue the computation.
const andThenGoodResult: Result<boolean, Error> = goodResult.andThen(i => Result.ok(i === 10));
expect(andThenGoodResult.isOk() && andThenGoodResult.value).toEqual(true);

// Use `or` or `orElse` to handle the error.
const orBadResult: Result<number, Error> = badResult.or(10);
expect(orBadResult.isOk() && orBadResult.value).toEqual(10);

const orElseBadResult: Result<number, Error> = badResult.orElse(e => e.message.length);
expect(orElseBadResult.isOk() && orElseBadResult.value).toEqual(20);

// Unwrap gets you out of Result land:

// If you're sure that the result is `Ok`, you can use `unwrap` to get the value.
// This will throw an exception if the result is an error, so use with caution.
const finalAwesomeResult = goodResult.unwrap();
expect(finalAwesomeResult).toBe(10);

// If you're not sure, you can provide a default value with `unwrapOr`.
const anotherAwesomeResult = badResult.unwrapOr(42);
expect(anotherAwesomeResult).toBe(42);

// Or you can provide a function that will be called with the error.
const yetAnotherAwesomeResult = badResult.unwrapOrElse(e => e.message.length);
expect(yetAnotherAwesomeResult).toBe(20);
```

### Interop with exceptions and promises

To use Result with code that throws exceptions, you can use the `try` function:

```typescript
class LegacyError extends Error {
    readonly type = 'legacy';
}

function mightThrowAnError(): number {
    throw new Error('This is an error');
}

const result = Result.try(() => mightThrowAnError()).mapErr(e => new LegacyError(String(e)));
expect(result.isErr() && result.err.type).toBe('legacy');
```

Or a Promise that might reject:

```typescript
function mightReject(): Promise<number> {
    return Promise.reject(new Error('This is an error'));
}

const result = await Result.tryPromise(() => mightReject());
expect(result.isErr() && (result.err as Error).message).toBe('This is an error');
```

## API docs

tbd
