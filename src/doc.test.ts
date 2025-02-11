import { Result } from './result';
import { expect } from '@jest/globals';

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

describe('result', () => {
    test('into', () => {
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
    });
    test('example', () => {
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

        // `map` and `mapErr` maps `Result` to another one.
        const mappedGoodResult: Result<number, Error> = goodResult.map(i => i + 1);
        const mappedBadResult: Result<number, Error> = badResult.mapErr(
            e => new Error(e.message + " and I can't fix it"),
        );
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

        // Unwrap gets you out of Result land.

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
    });
    test('try', () => {
        class LegacyError extends Error {
            readonly type = 'legacy';
        }

        function mightThrowAnError(): number {
            throw new Error('This is an error');
        }

        const result = Result.try(() => mightThrowAnError()).mapErr(e => new LegacyError(String(e)));
        expect(result.isErr() && result.err.type).toBe('legacy');
    });
    test('tryPromise', async () => {
        function mightReject(): Promise<number> {
            return Promise.reject(new Error('This is an error'));
        }

        const result = await Result.tryPromise(() => mightReject());
        expect(result.isErr() && (result.err as Error).message).toBe('This is an error');
    });
    test('handle', () => {
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

        const parsedHeader = parseHeader([1, 3, 3]);
        expect(parsedHeader.isOk() && parsedHeader.value).toStrictEqual(['one', 3]);

        const anotherHeader = parseHeader([3, 2, 1]);
        expect(anotherHeader.isErr() && anotherHeader.err.type).toStrictEqual('version');

        const yetAnotherHeader = parseHeader([1]);
        expect(yetAnotherHeader.isErr() && yetAnotherHeader.err.type).toStrictEqual('header-size');

        const moreHeader = parseHeader([1, 5, 3]);
        expect(moreHeader.isErr() && moreHeader.err.message).toStrictEqual('Header size does not match');
    });
    test('handle', () => {
        function parseHeader(header: number[]): Result<[Version, number], VersionError | HeaderSizeError> {
            return Result.handle(function* () {
                const version: Version = yield* parseHeaderVersion(header);
                const length: number = yield* parseHeaderLength(header);
                if (length !== header.length) {
                    return yield* Result.err(new HeaderSizeError('Header size does not match'));
                }
                return [version, length];
            });
        }

        const parsedHeader = parseHeader([1, 3, 3]);
        expect(parsedHeader.isOk() && parsedHeader.value).toStrictEqual(['one', 3]);

        const anotherHeader = parseHeader([3, 2, 1]);
        expect(anotherHeader.isErr() && anotherHeader.err.type).toStrictEqual('version');

        const yetAnotherHeader = parseHeader([1]);
        expect(yetAnotherHeader.isErr() && yetAnotherHeader.err.type).toStrictEqual('header-size');

        const moreHeader = parseHeader([1, 5, 3]);
        expect(moreHeader.isErr() && moreHeader.err.message).toStrictEqual('Header size does not match');
    });
    test('async', async () => {
        async function asyncParseHeader(header: number[]): Promise<Result<[Version, number], Error>> {
            return Result.handleAsync(async function* () {
                // These are not async functions, but it's just an example
                const version: Version = yield* await parseHeaderVersion(header);
                const length: number = yield* await parseHeaderLength(header);
                return [version, length];
            });
        }
        const parsedHeader = await asyncParseHeader([1, 2, 3]);
        expect(parsedHeader.isOk() && parsedHeader.value).toStrictEqual(['one', 2]);

        const anotherHeader = await asyncParseHeader([3, 2, 1]);
        expect(anotherHeader.isErr() && anotherHeader.err.message).toStrictEqual('Invalid version');
    });
});
