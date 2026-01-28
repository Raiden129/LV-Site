
export class Result {
    constructor(ok, value, error = null) {
        this.ok = ok;
        this.value = value;
        this.error = error;
    }

    static success(value) {
        return new Result(true, value, null);
    }

    static failure(error) {
        return new Result(false, null, error instanceof Error ? error.message : error);
    }

    map(fn) {
        if (!this.ok) return this;
        try {
            return Result.success(fn(this.value));
        } catch (e) {
            return Result.failure(e);
        }
    }

    async mapAsync(fn) {
        if (!this.ok) return this;
        try {
            return Result.success(await fn(this.value));
        } catch (e) {
            return Result.failure(e);
        }
    }

    unwrapOr(defaultValue) {
        return this.ok ? this.value : defaultValue;
    }

    match(handlers) {
        return this.ok ? handlers.success(this.value) : handlers.failure(this.error);
    }
}

export function tryCatch(fn) {
    return async (...args) => {
        try {
            const result = await fn(...args);
            return Result.success(result);
        } catch (e) {
            return Result.failure(e);
        }
    };
}

export function tryCatchSync(fn) {
    return (...args) => {
        try {
            return Result.success(fn(...args));
        } catch (e) {
            return Result.failure(e);
        }
    };
}
