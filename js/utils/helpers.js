

export const encodePath = (path) =>
    path?.split('/').map(encodeURIComponent).join('/') ?? '';


export const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
};

export const formatViewCount = formatNumber;

export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const naturalSort = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base'
}).compare;

export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export const checkImageExists = (src) => {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
    });
};

export const debounce = (fn, ms) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), ms);
    };
};

export const throttle = (fn, ms) => {
    let last = 0;
    return (...args) => {
        const now = Date.now();
        if (now - last >= ms) {
            last = now;
            fn(...args);
        }
    };
};

export const withTimeout = (promise, ms, message = 'Timeout') => {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(message)), ms)
        )
    ]);
};

export const retry = async (fn, { retries = 3, delay = 1000, backoff = 2 } = {}) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (e) {
            if (i === retries - 1) throw e;
            await sleep(delay * Math.pow(backoff, i));
        }
    }
};

export const chunk = (arr, size) =>
    Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
        arr.slice(i * size, (i + 1) * size)
    );


export const sanitizeFirebasePath = (str) => {
    return String(str).replace(/[.#$\[\]]/g, '_');
};


export const createLazyElements = (selectors) => {
    const cache = {};
    return new Proxy({}, {
        get(_, key) {
            if (!(key in cache) && selectors[key]) {
                cache[key] = document.getElementById(selectors[key]);
            }
            return cache[key];
        }
    });
};


export const waitForGlobal = (checkFn, timeoutMs = 3000, pollIntervalMs = 50) => {
    return new Promise((resolve) => {
        if (checkFn()) return resolve(true);

        const start = Date.now();
        const interval = setInterval(() => {
            if (checkFn()) {
                clearInterval(interval);
                resolve(true);
            } else if (Date.now() - start > timeoutMs) {
                clearInterval(interval);
                resolve(false);
            }
        }, pollIntervalMs);
    });
};
