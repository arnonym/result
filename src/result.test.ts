/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection ES6RedundantAwait

import { Failure, GetErrors, GetOkays, NeverIfExistingInUnion, Ok, Result, Success } from './result';
import { pipe } from './pipe';

function assertTrue<T extends true>() {}

type TypeEqualityGuard<A, B> = Exclude<A, B> | Exclude<B, A> extends never ? true : false;

class TestCls {
    constructor(public member: number) {}
}

function getValue(fail: boolean): Result<number, string> {
    if (fail) {
        return Result.err('failed');
    }
    return Result.ok(3);
}

describe('result', () => {
    describe('creation', () => {
        test('should create ok value', () => {
            const val = Result.ok(3);
            assertTrue<TypeEqualityGuard<typeof val, Result<number, never>>>();
            expect(val.isOk()).toBe(true);
            expect(val.isOk() && val.value).toBe(3);
            expect(val.isErr()).toBe(false);
        });
        test('should create err value', () => {
            const val = Result.err(3);
            expect(val.isErr()).toBe(true);
            expect(val.isErr() && val.err).toBe(3);
            expect(val.isOk()).toBe(false);
        });
    });

    describe('map', () => {
        test('should map on ok', () => {
            const val = Result.ok(3);
            const mapped = val.map(_ => _ + 1);
            assertTrue<TypeEqualityGuard<typeof mapped, Result<number, never>>>();
            expect(mapped.isOk() && mapped.value).toBe(4);
        });
        test('should not map on err', () => {
            const val = Result.err(3);
            const mapped = val.map(_ => _ + 10);
            assertTrue<TypeEqualityGuard<typeof mapped, Result<number, number>>>();
            expect(mapped.isErr() && mapped.err).toBe(3);
        });
    });

    describe('mapError', () => {
        test('should not mapError on ok', () => {
            const val = Result.ok(3);
            const mapped1 = val.mapErr(_ => 1);
            const mapped2 = mapped1.mapErr(_ => '2');
            assertTrue<TypeEqualityGuard<typeof mapped1, Result<number, number>>>();
            assertTrue<TypeEqualityGuard<typeof mapped2, Result<number, string>>>();
            expect(mapped1.isOk() && mapped1.value).toBe(3);
            expect(mapped2.isOk() && mapped2.value).toBe(3);
        });
        test('should mapError on err', () => {
            const val = Result.err(3);
            const mapped = val.mapErr(_ => _ + 1);
            assertTrue<TypeEqualityGuard<typeof mapped, Result<never, number>>>();
            expect(mapped.isErr() && mapped.err).toBe(4);
        });
    });

    describe('andThen', () => {
        test('should andThen on ok', () => {
            const val = Result.ok(3);
            const mapped = val.andThen(_ => Result.ok(_ + 1));
            assertTrue<TypeEqualityGuard<typeof mapped, Result<number, never>>>();
            expect(mapped.isOk() && mapped.value).toBe(4);
        });
        test('should not andThen on err', () => {
            const val = Result.err(3);
            const mapped = val.andThen(_ => Result.ok(_ + 1));
            assertTrue<TypeEqualityGuard<typeof mapped, Result<number, number>>>();
            expect(mapped.isErr() && mapped.err).toBe(3);
        });
        test('should andThen ok to err', () => {
            const val = Result.ok(3);
            const mapped = val.andThen(_ => Result.err(10));
            assertTrue<TypeEqualityGuard<typeof mapped, Result<never, number>>>();
            expect(mapped.isErr() && mapped.err).toBe(10);
        });
        test('should andThen ok to both', () => {
            const val = Result.ok(3);
            const mapped = val.andThen(i => {
                if (i % 2 === 0) {
                    return Result.err(10);
                } else {
                    return Result.ok(2);
                }
            });
            assertTrue<TypeEqualityGuard<typeof mapped, Result<number, number>>>();
            expect(mapped.isOk() && mapped.value).toBe(2);
        });
    });

    describe('all', () => {
        test('should get all ok', () => {
            const val1 = Result.ok(1);
            const val2 = Result.ok('2');
            const val3 = Result.ok(3);
            const mapped = Result.all(val1, val2, val3);
            assertTrue<TypeEqualityGuard<typeof mapped, Result<[number, string, number], never>>>();
            expect(mapped.isOk() && mapped.value).toStrictEqual([1, '2', 3]);
        });
        test('should get the one error', () => {
            const val1 = Result.ok(1);
            const val2 = Result.err(2);
            const val3 = Result.ok(3);
            const mapped = Result.all(val1, val2, val3);
            assertTrue<TypeEqualityGuard<typeof mapped, Result<never, number>>>();
            expect(mapped.isErr() && mapped.err).toBe(2);
        });
        test('should get the first error', () => {
            const val1 = Result.ok(1);
            const val2 = Result.err(2);
            const val3 = Result.err(3);
            const mapped = Result.all(val1, val2, val3);
            assertTrue<TypeEqualityGuard<typeof mapped, Result<never, number>>>();
            expect(mapped.isErr() && mapped.err).toBe(2);
        });
        test('should "map" the all error', () => {
            const val1 = getValue(true);
            const val2 = getValue(false);
            const val3 = getValue(true);
            const mapped = Result.all(val1, val2, val3);
            assertTrue<TypeEqualityGuard<typeof mapped, Result<[number, number, number], string>>>();
            const added = mapped.map(_ => _.map(_2 => `hey ${_2}`));
            expect(added.isErr() && added.err).toBe('failed');
        });
        test('should "map" the all result', () => {
            const val1 = Result.ok(1);
            const val2 = Result.ok(2);
            const val3 = Result.ok('3');
            const mapped = Result.all(val1, val2, val3);
            assertTrue<TypeEqualityGuard<typeof mapped, Result<[number, number, string], never>>>();
            const added = mapped.map(_ => _.map(_2 => `hey ${_2}`));
            expect(added.isOk() && added.value).toStrictEqual(['hey 1', 'hey 2', 'hey 3']);
        });
        test('should infer result correctly', () => {
            assertTrue<TypeEqualityGuard<[number, number, string], [number, number, string]>>();
            assertTrue<TypeEqualityGuard<NeverIfExistingInUnion<[number, never, string]>, never>>();
            assertTrue<
                TypeEqualityGuard<
                    GetOkays<[Result<number, string>, Result<number, string>, Result<number, string>]>,
                    [number, number, number]
                >
            >();
            assertTrue<
                TypeEqualityGuard<
                    GetErrors<[Result<number, string>, Result<number, string>, Result<number, string>]>,
                    [string, string, string]
                >
            >();
            let x: GetOkays<[Result<number, string>, Result<never, string>, Ok<number>]>;
            assertTrue<TypeEqualityGuard<typeof x, [number, never, number]>>();
        });
    });

    describe('try', () => {
        test('should at least "try" and succeed', () => {
            const val = Result.try(() => 1);
            assertTrue<TypeEqualityGuard<typeof val, Result<number, unknown>>>();
            expect(val.isOk() && val.value).toBe(1);
        });
        test('should at least "try" and fail', () => {
            const val = Result.try(() => {
                throw 3;
            });
            assertTrue<TypeEqualityGuard<typeof val, Result<never, unknown>>>();
            expect(val.isErr() && val.err).toBe(3);
        });
        test('should at least "try" and fail and map error', () => {
            const val = Result.try(() => {
                throw 3;
            }).mapErr(e => `Something went wrong: ${e}`);
            assertTrue<TypeEqualityGuard<typeof val, Result<never, string>>>();
            expect(val.isErr() && val.err).toBe('Something went wrong: 3');
        });

        test('should "match" ok', () => {
            const val1 = Result.ok(1);
            const r = val1.match({
                ok: _ => _,
                err: _ => 2,
            });
            expect(r).toBe(1);
        });
        test('should "match" err', () => {
            const val1 = Result.err(3);
            const r = val1.match({
                ok: _ => 1000,
                err: _ => _ + 1,
            });
            expect(r).toBe(4);
        });
    });

    describe('unwrap', () => {
        test('should "unwrap" ok', () => {
            const val = Result.ok(3);
            const val2 = val.unwrap();
            expect(val2).toBe(3);
        });
        test('should not "unwrap" err but throw', () => {
            const val = Result.err(-1);
            expect(() => {
                val.unwrap();
            }).toThrow('-1');
        });
    });

    describe('expect', () => {
        test('should "expect" ok', () => {
            const val = Result.ok(3);
            const val2 = val.expect('You did it wrong!');
            expect(val2).toBe(3);
        });
        test('should not "expect" err but throw with string', () => {
            const val = Result.err(-1);
            expect(() => {
                val.expect('You did it wrong!');
            }).toThrow(new Error('You did it wrong!'));
        });
        test('should not "expect" err but throw with function', () => {
            const val = Result.err(-1);
            expect(() => {
                val.expect(e => `You did it wrong: ${e}`);
            }).toThrow(new Error('You did it wrong: -1'));
        });
    });

    describe('unwrapErr', () => {
        test('should "unwrapErr" err', () => {
            const val = Result.err(3);
            const val2 = val.unwrapErr();
            expect(val2).toBe(3);
        });
        test('should not "unwrapErr" err but throw', () => {
            const val = Result.ok(-2);
            expect(() => {
                val.unwrapErr();
            }).toThrow('Tried to unwrapErr on value: -2');
        });
    });

    describe('unwrapOr', () => {
        test('should "unwrapOr" ok to ok', () => {
            const val = Result.ok(3);
            const val2 = val.unwrapOr(4);
            expect(val2).toBe(3);
        });
        test('should "unwrapOr" err to default', () => {
            const val = Result.err(-1);
            const val2 = val.unwrapOr(4);
            expect(val2).toBe(4);
        });
        test('should "unwrapOrElse" ok to ok', () => {
            const val = Result.ok(3);
            const val2 = val.unwrapOrElse(() => 4);
            expect(val2).toBe(3);
        });
        test('should "unwrapOrElse" err to default', () => {
            const val = Result.err(-1);
            const val2 = val.unwrapOrElse(() => 4);
            expect(val2).toBe(4);
        });
        test('should "unwrapOrElse" err to default with fn', () => {
            const val = Result.err(-1);
            const val2 = val.unwrapOrElse(e => e + 2);
            expect(val2).toBe(1);
        });
    });

    describe('or', () => {
        test('should "or" ok', () => {
            const val = Result.ok(3);
            const val2 = val.or(4);
            expect(val2.isOk() && val2.value).toBe(3);
        });
        test('should "or" err to default', () => {
            const val = Result.err(-1);
            const val2 = val.or(4);
            expect(val2.isOk() && val2.value).toBe(4);
        });
    });

    describe('orElse', () => {
        test('should "orElse" ok', () => {
            const val = Result.ok(3);
            const val2 = val.orElse(() => 4);
            expect(val2.isOk() && val2.value).toBe(3);
        });
        test('should "orElse" err', () => {
            const val = Result.err(-1);
            const val2 = val.orElse(() => 4);
            expect(val2.isOk() && val2.value).toBe(4);
        });
        test('should "orElse" err with parameter', () => {
            const val = Result.err(-1);
            const val2 = val.orElse(e => e + 2);
            expect(val2.isOk() && val2.value).toBe(1);
        });
    });

    describe('type inference', () => {
        test('should infer some types', () => {
            const ok = Result.ok(-1);
            assertTrue<TypeEqualityGuard<Success<typeof ok>, number>>();
            assertTrue<TypeEqualityGuard<Failure<typeof ok>, never>>();
            const err = Result.err(-1);
            assertTrue<TypeEqualityGuard<Failure<typeof err>, number>>();
            assertTrue<TypeEqualityGuard<Success<typeof err>, never>>();
        });
    });

    describe('tryPromise', () => {
        test('tryPromise should handle resolved promises', async () => {
            const ok = await Result.tryPromise(() => Promise.resolve(3));
            assertTrue<TypeEqualityGuard<Success<typeof ok>, number>>();
            assertTrue<TypeEqualityGuard<Failure<typeof ok>, unknown>>();
            expect(ok.isOk() && ok.value).toBe(3);
        });
        test('tryPromise should handle rejected promises', async () => {
            const ok = await Result.tryPromise(() => Promise.reject(3));
            assertTrue<TypeEqualityGuard<Failure<typeof ok>, unknown>>();
            expect(ok.isErr() && ok.err).toBe(3);
        });
    });

    describe('handle', () => {
        test('handle returns ok', () => {
            const result = Result.handle(function* () {
                return 3;
            });
            assertTrue<TypeEqualityGuard<Success<typeof result>, number>>();
            expect(result.isOk() && result.value).toStrictEqual(3);
        });
        test('handle returns err', () => {
            const result = Result.handle(function* () {
                yield* Result.err('3');
            });
            assertTrue<TypeEqualityGuard<Failure<typeof result>, string>>();
            expect(result.isErr() && result.err).toStrictEqual('3');
        });
        test('handle yields ok', () => {
            const result = Result.handle(function* () {
                const ok = yield* Result.ok('3');
                assertTrue<TypeEqualityGuard<typeof ok, string>>();
                return ok + '!';
            });
            assertTrue<TypeEqualityGuard<Success<typeof result>, string>>();
            expect(result.isOk() && result.value).toStrictEqual('3!');
        });
        test('handle yields err', () => {
            const result = Result.handle(function* () {
                const ok = yield* Result.err('3');
                assertTrue<TypeEqualityGuard<typeof ok, never>>();
                return 3;
            });
            assertTrue<TypeEqualityGuard<typeof result, Result<number, string>>>();
            expect(result.isErr() && result.err).toStrictEqual('3');
        });
        test('handle different returns ok', () => {
            const cond = false;
            const result = Result.handle(function* () {
                if (cond) {
                    return '3';
                }
                return 3;
            });
            assertTrue<TypeEqualityGuard<Success<typeof result>, 3 | '3'>>();
            assertTrue<TypeEqualityGuard<Failure<typeof result>, never>>();
            assertTrue<TypeEqualityGuard<typeof result, Result<3 | '3', never>>>();
            expect(result.isOk() && result.value).toStrictEqual(3);
        });
        test('more complex return type', () => {
            const cond = false;
            const result = Result.handle(function* () {
                const w = yield* Result.ok(1);
                if (cond) {
                    const w1 = yield* Result.err(4);
                    const w2 = yield* Result.err('4');
                    return '3';
                }
                const x1 = yield* Result.err(3);
                const x2 = yield* Result.ok('2');
                const x3 = yield* Result.ok(1);
                return x3 + 1;
            });
            assertTrue<TypeEqualityGuard<typeof result, Result<'3' | number, string | number>>>();
            expect(result.isErr() && result.err).toBe(3);
        });
        test('handle returns class ok', () => {
            const result = Result.handle(function* () {
                return new TestCls(99);
            });
            assertTrue<TypeEqualityGuard<Success<typeof result>, TestCls>>();
            expect(result.isOk() && result.value.member).toStrictEqual(99);
        });
        test('handle returns literal ok', () => {
            const result = Result.handle(function* () {
                return 'literal' as const;
            });
            assertTrue<TypeEqualityGuard<Success<typeof result>, 'literal'>>();
            expect(result.isOk() && result.value).toStrictEqual('literal');
        });
        test('handle inline', () => {
            const result = Result.handle(function* () {
                return new TestCls(yield* getValue(true));
            });
            assertTrue<TypeEqualityGuard<Success<typeof result>, TestCls>>();
            expect(result.isErr() && result.err).toStrictEqual('failed');
        });
        test('handle generator in class method', () => {
            class TestWithThisBinding {
                private value = 3;

                classMethod(): Result<number, never> {
                    return Result.handle(this, function* () {
                        return this.value;
                    });
                }
            }

            const test = new TestWithThisBinding();
            const result = test.classMethod();
            expect(result.isOk() && result.value).toBe(3);
        });
    });

    describe('handleAsync', () => {
        test('handle generator with async calls returning ok', async () => {
            const no = false;
            const result = await Result.handleAsync(async function* () {
                const val = yield* await Promise.resolve(Result.ok(3));
                if (no) {
                    const err = yield* await Promise.resolve(Result.err(3));
                }
                return val;
            });
            expect(result.isOk() && result.value).toBe(3);
        });
        test('handle generator with async calls returning error', async () => {
            const result = await Result.handleAsync(async function* () {
                const val = yield* await Promise.resolve(Result.ok(3));
                const err = yield* await Promise.resolve(Result.err(3));
                return val;
            });
            expect(result.isErr() && result.err).toBe(3);
        });
        test('handle generator with async and non-async calls returning ok', async () => {
            const result = await Result.handleAsync(async function* () {
                const val1 = yield* await Promise.resolve(Result.ok(5));
                const val2 = yield* Result.ok(3);
                return val2;
            });
            expect(result.isOk() && result.value).toBe(3);
        });
    });

    describe('assertions', () => {
        test('assertOk on ok', () => {
            const result = Result.ok(3);
            Result.assertOk(result);
            expect(result.value).toBe(3);
        });
        test('assertOk on error should throw', () => {
            const result = Result.err(3);
            expect(() => Result.assertOk(result)).toThrow('Expected Ok, got Err: 3');
        });
        test('assertErr on err', () => {
            const result = Result.err(3);
            Result.assertErr(result);
            expect(result.err).toBe(3);
        });
        test('assertOk on error should throw', () => {
            const result = Result.ok(3);
            expect(() => Result.assertErr(result)).toThrow('Expected Err, got Ok: 3');
        });
    });

    describe('pipe', () => {
        test('should pipe map', () => {
            const result = pipe(
                Result.ok(3),
                Result.map(_ => _ + 1),
            );
            assertTrue<TypeEqualityGuard<typeof result, Result<number, never>>>();
            expect(result).toStrictEqual(Result.ok(4));
        });
        test('should pipe mapErr', () => {
            const result = pipe(
                Result.err(3),
                Result.mapErr(_ => _ + 1),
            );
            assertTrue<TypeEqualityGuard<typeof result, Result<never, number>>>();
            expect(result).toStrictEqual(Result.err(4));
        });
        test('should pipe mapErr and mapOk on err', () => {
            const result = pipe(
                Result.err(3),
                Result.map(_ => _ + 1),
                Result.mapErr(_ => _ + 1),
            );
            assertTrue<TypeEqualityGuard<typeof result, Result<number, number>>>();
            expect(result).toStrictEqual(Result.err(4));
        });
        test('should pipe mapErr and mapOk on ok', () => {
            const result = pipe(
                Result.ok(3),
                Result.map(_ => _ + 1),
                Result.mapErr(_ => _ + 1),
            );
            assertTrue<TypeEqualityGuard<typeof result, Result<number, number>>>();
            expect(result).toStrictEqual(Result.ok(4));
        });
        test('should pipe andThen from okay', () => {
            const result = pipe(
                Result.ok(3),
                Result.andThen(_ => Result.ok(_ + 1)),
                Result.andThen(_ => Result.err(_ + 1)),
            );
            assertTrue<TypeEqualityGuard<typeof result, Result<never, number>>>();
            expect(result).toStrictEqual(Result.err(5));
        });
        test('should not pipe andThen from err', () => {
            const result = pipe(
                Result.err(2),
                Result.andThen(i => Result.ok(i + 1)),
            );
            expect(result).toStrictEqual(Result.err(2));
        });
        test('should not pipe or from ok', () => {
            const result = pipe(Result.ok(3), Result.or(4));
            assertTrue<TypeEqualityGuard<typeof result, Result<number, never>>>();
            expect(result).toStrictEqual(Result.ok(3));
        });
        test('should pipe or from err', () => {
            const result = pipe(Result.err(3), Result.or(4));
            assertTrue<TypeEqualityGuard<typeof result, Result<number, never>>>();
            expect(result).toStrictEqual(Result.ok(4));
        });
        test('should not pipe orElse from ok', () => {
            const result = pipe(
                Result.ok(3),
                Result.orElse(_ => 4),
            );
            assertTrue<TypeEqualityGuard<typeof result, Result<number, never>>>();
            expect(result).toStrictEqual(Result.ok(3));
        });
        test('should pipe orElse from err', () => {
            const result = pipe(
                Result.err(3),
                Result.orElse(_ => 4),
            );
            assertTrue<TypeEqualityGuard<typeof result, Result<number, never>>>();
            expect(result).toStrictEqual(Result.ok(4));
        });
        test('should pipe unwrap', () => {
            const result = pipe(Result.ok(3), Result.unwrap);
            assertTrue<TypeEqualityGuard<typeof result, number>>();
            expect(result).toStrictEqual(3);
        });
        test('should pipe unwrapOr', () => {
            const result = pipe(Result.err(3), Result.unwrapOr(4));
            assertTrue<TypeEqualityGuard<typeof result, number>>();
            expect(result).toStrictEqual(4);
        });
        test('should pipe unwrapOrElse from err', () => {
            const result = pipe(
                Result.err(3),
                Result.unwrapOrElse(_ => '1'),
            );
            assertTrue<TypeEqualityGuard<typeof result, string>>();
            expect(result).toStrictEqual('1');
        });
        test('should not pipe unwrapOrElse from ok', () => {
            const result = pipe(
                Result.ok(3),
                Result.unwrapOrElse(_ => '1'),
            );
            assertTrue<TypeEqualityGuard<typeof result, string | number>>();
            expect(result).toStrictEqual(3);
        });
        test('should pipe match on ok', () => {
            const result = pipe(
                Result.ok(3),
                Result.match({
                    ok: _ => 2,
                    err: _ => 4,
                }),
            );
            assertTrue<TypeEqualityGuard<typeof result, number>>();
            expect(result).toStrictEqual(2);
        });
        test('should pipe match on err', () => {
            const result = pipe(
                Result.err(3),
                Result.match({
                    ok: _ => 2,
                    err: _ => 4,
                }),
            );
            assertTrue<TypeEqualityGuard<typeof result, number>>();
            expect(result).toStrictEqual(4);
        });
        test('should pipe andThen into both ok and err', () => {
            const result = pipe(
                Result.ok(5),
                Result.andThen(n => Result.ok(n + 1)),
                Result.andThen(n => {
                    if (n % 2 === 0) {
                        return Result.ok(n);
                    } else {
                        return Result.err('error');
                    }
                }),
            );
            assertTrue<TypeEqualityGuard<typeof result, Result<number, string>>>();
            expect(result).toStrictEqual(Result.ok(6));
        });
    });
});
