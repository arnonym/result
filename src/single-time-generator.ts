export class SingleTimeGenerator<T, TReturn> implements Iterator<T, TReturn> {
    private called = false;

    constructor(readonly value: T) {}

    next(value: TReturn): IteratorResult<T, TReturn> {
        if (this.called) {
            return {
                value,
                done: true,
            };
        } else {
            this.called = true;
            return {
                value: this.value,
                done: false,
            };
        }
    }

    return(value: TReturn): IteratorResult<T, TReturn> {
        return {
            value,
            done: true,
        };
    }

    throw(error: unknown): IteratorResult<T, TReturn> {
        throw error;
    }

    [Symbol.iterator](): Iterator<T, TReturn> {
        return new SingleTimeGenerator<T, TReturn>(this.value);
    }
}
