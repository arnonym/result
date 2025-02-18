# API Reference

## Result Class Methods

### ok<O>(value: O): Result<O, never>

Creates a successful Result.

**Parameters**: `value` The value to be wrapped into Result

**returns** a new `Result` instance.

#### Example

```typescript
const result = Result.ok('ok'); // Result<string, never>
```

### err<E>(error: E): Result<never, E>

Creates a failed Result.

**Parameters**: `error` The error to be wrapped into Result

**returns** a new `Result` instance.

#### Example

```typescript
const result = Result.err('bad'); // Result<never, string>
```

### handle(function\* () {}): Result<E, O>

Runs a generator functions which may yield Results and

- in case of an error short circuits it as the result of the handle function
- in case of success returns the unwrapped result inside the generator function

The return value of the generator function will be wrapped in a successful Result.

See README.md for examples.

### handleAsync(async function\* () {}): Promise<Result<E, O>>

same as `handle` for async functions.

### try<T>(fn: () => T): Result<T, unknown>

Runs `fn` and

**returns**

- the return value of `fn` as a successful Result
- any thrown exception as a failed Result

### tryPromise<T>(fn: () => Promise<T>): Promise<Result<T, unknown>>

Runs `fn` and

**returns**

- the resolved value of the promise returned as a successful Result
- the rejected value of the promise returned as a failed Result

### all(...list: Result): Result<O, E>

### assertOk(result: Result): asserts result is Ok<O>

asserts that `result` is a successful result. Otherwise, throws an exception. Useful in tests.

### assertErr(result: Result): asserts result is Err<O>

asserts that `result` is a failure result. Otherwise, throws an exception. Useful in tests.

## Result Instance Methods
