





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
        return new Result(false, null, normalizeError(error));
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

export function normalizeError(error, fallbackMessage = 'Unknown error') {
    if (error && typeof error === 'object' && 'message' in error && 'cause' in error && 'code' in error) {
        return error;
    }

    if (error instanceof Error) {
        const code = typeof error.code === 'string' ? error.code : 'UNKNOWN_ERROR';
        return {
            message: error.message || fallbackMessage,
            cause: error,
            code
        };
    }

    if (typeof error === 'string') {
        return {
            message: error,
            cause: null,
            code: 'UNKNOWN_ERROR'
        };
    }

    return {
        message: fallbackMessage,
        cause: error ?? null,
        code: 'UNKNOWN_ERROR'
    };
}

export function getErrorMessage(error, fallbackMessage = 'Unexpected error') {
    if (!error) return fallbackMessage;
    if (typeof error === 'string') return error;
    if (typeof error.message === 'string' && error.message.trim()) return error.message;
    return fallbackMessage;
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
