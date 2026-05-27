export type TinyRequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface TinyRequestOptions extends Omit<RequestInit, 'body' | 'cache' | 'method'> {
    cache?: boolean | number;
    cacheKey?: string;
    parse?: 'json' | 'text' | 'blob' | 'arrayBuffer' | 'response' | false;
    retry?: number;
    retryDelay?: number | ((attempt: number, error: unknown) => number);
    timeout?: number;
    key?: string;
}

export interface TinyUploadOptions extends TinyRequestOptions {
    fieldName?: string;
}

export interface TinyRequestDefaults {
    baseUrl?: string;
    headers?: HeadersInit;
    cache?: boolean | number;
    retry?: number;
    retryDelay?: number | ((attempt: number, error: unknown) => number);
    timeout?: number;
    credentials?: RequestCredentials;
}

export interface TinyRequestContext {
    url: string;
    method: TinyRequestMethod;
    options: TinyRequestOptions;
    attempt: number;
}

export type TinyRequestInterceptor = (
    input: RequestInfo | URL,
    init: RequestInit,
    context: TinyRequestContext
) => void | RequestInit | Promise<void | RequestInit>;

export type TinyResponseInterceptor = (
    value: unknown,
    response: Response,
    context: TinyRequestContext
) => unknown | Promise<unknown>;

export type TinyErrorInterceptor = (
    error: unknown,
    context: TinyRequestContext
) => unknown | Promise<unknown>;

interface CacheEntry {
    value: unknown;
    expiresAt: number;
}

interface InterceptorBucket<T> {
    use(handler: T): () => void;
    clear(): void;
}

function createBucket<T>(): InterceptorBucket<T> & { handlers: Set<T> } {
    const handlers = new Set<T>();

    return {
        handlers,
        use(handler: T) {
            handlers.add(handler);
            return () => handlers.delete(handler);
        },
        clear() {
            handlers.clear();
        }
    };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Object.prototype.toString.call(value) === '[object Object]';
}

function isFormBody(value: unknown): boolean {
    return (
        typeof FormData !== 'undefined' && value instanceof FormData
    ) || (
        typeof Blob !== 'undefined' && value instanceof Blob
    ) || (
        typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams
    ) || (
        typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer
    );
}

function mergeHeaders(...headers: Array<HeadersInit | undefined>): Headers {
    const merged = new Headers();

    for (const source of headers) {
        if (!source) {
            continue;
        }

        new Headers(source).forEach((value, key) => {
            merged.set(key, value);
        });
    }

    return merged;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TinyRequest {
    readonly interceptors = {
        request: createBucket<TinyRequestInterceptor>(),
        response: createBucket<TinyResponseInterceptor>(),
        error: createBucket<TinyErrorInterceptor>()
    };

    private defaults: TinyRequestDefaults;
    private cacheStore = new Map<string, CacheEntry>();
    private controllers = new Map<string, Set<AbortController>>();

    constructor(defaults: TinyRequestDefaults = {}) {
        this.defaults = { ...defaults };
    }

    config(defaults: TinyRequestDefaults): this {
        this.defaults = {
            ...this.defaults,
            ...defaults,
            headers: mergeHeaders(this.defaults.headers, defaults.headers)
        };
        return this;
    }

    get<T = unknown>(url: string, options?: TinyRequestOptions): Promise<T> {
        return this.send<T>('GET', url, undefined, options);
    }

    post<T = unknown>(url: string, body?: unknown, options?: TinyRequestOptions): Promise<T> {
        return this.send<T>('POST', url, body, options);
    }

    put<T = unknown>(url: string, body?: unknown, options?: TinyRequestOptions): Promise<T> {
        return this.send<T>('PUT', url, body, options);
    }

    patch<T = unknown>(url: string, body?: unknown, options?: TinyRequestOptions): Promise<T> {
        return this.send<T>('PATCH', url, body, options);
    }

    delete<T = unknown>(url: string, options?: TinyRequestOptions): Promise<T> {
        return this.send<T>('DELETE', url, undefined, options);
    }

    upload<T = unknown>(
        url: string,
        body: FormData | Blob | File | Record<string, unknown>,
        options: TinyUploadOptions = {}
    ): Promise<T> {
        let payload: BodyInit;

        if (typeof FormData !== 'undefined' && body instanceof FormData) {
            payload = body;
        } else if (typeof Blob !== 'undefined' && body instanceof Blob) {
            const form = new FormData();
            form.append(options.fieldName || 'file', body);
            payload = form;
        } else {
            const fields = body as Record<string, unknown>;
            const form = new FormData();
            Object.keys(fields).forEach((key) => {
                const value = fields[key];
                if (Array.isArray(value)) {
                    value.forEach((item) => form.append(key, item as string | Blob));
                    return;
                }
                form.append(key, value as string | Blob);
            });
            payload = form;
        }

        return this.send<T>('POST', url, payload, options);
    }

    abort(key?: string): void {
        if (key) {
            this.abortKey(key);
            return;
        }

        for (const activeKey of Array.from(this.controllers.keys())) {
            this.abortKey(activeKey);
        }
    }

    cache(enabled: boolean | number = true): this {
        this.defaults.cache = enabled;
        return this;
    }

    clearCache(key?: string): void {
        if (key) {
            this.cacheStore.delete(key);
            return;
        }

        this.cacheStore.clear();
    }

    retry(count: number, delay?: TinyRequestDefaults['retryDelay']): this {
        this.defaults.retry = count;
        if (delay !== undefined) {
            this.defaults.retryDelay = delay;
        }
        return this;
    }

    timeout(ms: number): this {
        this.defaults.timeout = ms;
        return this;
    }

    private async send<T>(
        method: TinyRequestMethod,
        url: string,
        body?: unknown,
        options: TinyRequestOptions = {}
    ): Promise<T> {
        const requestUrl = this.resolveUrl(url);
        const requestOptions = this.mergeOptions(options);
        const cacheKey = this.createCacheKey(method, requestUrl, body, requestOptions);

        if (requestOptions.cache) {
            const cached = this.cacheStore.get(cacheKey);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.value as T;
            }
            if (cached) {
                this.cacheStore.delete(cacheKey);
            }
        }

        const attempts = Math.max(0, requestOptions.retry ?? 0);
        let lastError: unknown;

        for (let attempt = 0; attempt <= attempts; attempt += 1) {
            const context: TinyRequestContext = {
                url: requestUrl,
                method,
                options: requestOptions,
                attempt
            };

            try {
                const value = await this.tryFetch<T>(method, requestUrl, body, requestOptions, context);

                if (requestOptions.cache) {
                    this.cacheStore.set(cacheKey, {
                        value,
                        expiresAt: Date.now() + this.getCacheTtl(requestOptions.cache)
                    });
                }

                return value;
            } catch (error) {
                lastError = await this.applyErrorInterceptors(error, context);

                if (attempt >= attempts || !this.shouldRetry(lastError)) {
                    throw lastError;
                }

                const delay = this.getRetryDelay(attempt + 1, lastError, requestOptions.retryDelay);
                if (delay > 0) {
                    await sleep(delay);
                }
            }
        }

        throw lastError;
    }

    private async tryFetch<T>(
        method: TinyRequestMethod,
        url: string,
        body: unknown,
        options: TinyRequestOptions,
        context: TinyRequestContext
    ): Promise<T> {
        const controller = new AbortController();
        const key = options.key || url;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        this.trackController(key, controller);

        if (options.timeout && options.timeout > 0) {
            timeoutId = setTimeout(() => controller.abort(), options.timeout);
        }

        if (options.signal) {
            if (options.signal.aborted) {
                controller.abort();
            } else {
                options.signal.addEventListener('abort', () => controller.abort(), { once: true });
            }
        }

        try {
            const init = await this.createInit(method, body, options, controller, context);
            const response = await fetch(url, init);

            if (!response.ok) {
                throw new TinyRequestError(response);
            }

            const parsed = await this.parseResponse(response, options.parse);
            const intercepted = await this.applyResponseInterceptors(parsed, response, context);
            return intercepted as T;
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            this.untrackController(key, controller);
        }
    }

    private async createInit(
        method: TinyRequestMethod,
        body: unknown,
        options: TinyRequestOptions,
        controller: AbortController,
        context: TinyRequestContext
    ): Promise<RequestInit> {
        const headers = mergeHeaders(this.defaults.headers, options.headers);
        let payload = body as BodyInit | undefined;

        if (body !== undefined && isPlainObject(body)) {
            payload = JSON.stringify(body);
            if (!headers.has('content-type')) {
                headers.set('content-type', 'application/json');
            }
        } else if (body !== undefined && !isFormBody(body)) {
            payload = body as BodyInit;
        }

        const {
            cache: _cache,
            cacheKey: _cacheKey,
            key: _key,
            parse: _parse,
            retry: _retry,
            retryDelay: _retryDelay,
            timeout: _timeout,
            ...fetchOptions
        } = options;

        let init: RequestInit = {
            ...fetchOptions,
            method,
            headers,
            body: payload,
            signal: controller.signal
        };

        for (const interceptor of this.interceptors.request.handlers) {
            const next = await interceptor(context.url, init, context);
            if (next) {
                init = next;
            }
        }

        return init;
    }

    private async parseResponse(response: Response, parse: TinyRequestOptions['parse']): Promise<unknown> {
        if (parse === false || parse === 'response') {
            return response;
        }

        if (response.status === 204 || response.status === 205) {
            return undefined;
        }

        if (parse === 'blob') {
            return response.blob();
        }

        if (parse === 'arrayBuffer') {
            return response.arrayBuffer();
        }

        if (parse === 'text') {
            return response.text();
        }

        const contentType = response.headers.get('content-type') || '';
        if (parse === 'json' || contentType.includes('application/json')) {
            return response.json();
        }

        return response.text();
    }

    private async applyResponseInterceptors(
        value: unknown,
        response: Response,
        context: TinyRequestContext
    ): Promise<unknown> {
        let next = value;

        for (const interceptor of this.interceptors.response.handlers) {
            next = await interceptor(next, response, context);
        }

        return next;
    }

    private async applyErrorInterceptors(
        error: unknown,
        context: TinyRequestContext
    ): Promise<unknown> {
        let next = error;

        for (const interceptor of this.interceptors.error.handlers) {
            next = await interceptor(next, context);
        }

        return next;
    }

    private mergeOptions(options: TinyRequestOptions): TinyRequestOptions {
        return {
            ...options,
            cache: options.cache ?? this.defaults.cache,
            credentials: options.credentials ?? this.defaults.credentials,
            retry: options.retry ?? this.defaults.retry ?? 0,
            retryDelay: options.retryDelay ?? this.defaults.retryDelay,
            timeout: options.timeout ?? this.defaults.timeout,
            headers: mergeHeaders(this.defaults.headers, options.headers)
        };
    }

    private resolveUrl(url: string): string {
        if (!this.defaults.baseUrl || /^https?:\/\//i.test(url)) {
            return url;
        }

        return `${this.defaults.baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
    }

    private createCacheKey(
        method: TinyRequestMethod,
        url: string,
        body: unknown,
        options: TinyRequestOptions
    ): string {
        if (options.cacheKey) {
            return options.cacheKey;
        }

        return `${method}:${url}:${body === undefined ? '' : JSON.stringify(body)}`;
    }

    private getCacheTtl(cache: boolean | number): number {
        return typeof cache === 'number' ? cache : 30000;
    }

    private getRetryDelay(
        attempt: number,
        error: unknown,
        retryDelay: TinyRequestOptions['retryDelay']
    ): number {
        if (typeof retryDelay === 'function') {
            return retryDelay(attempt, error);
        }

        if (typeof retryDelay === 'number') {
            return retryDelay;
        }

        return attempt * 250;
    }

    private shouldRetry(error: unknown): boolean {
        if (error instanceof TinyRequestError) {
            return error.response.status >= 500;
        }

        return true;
    }

    private trackController(key: string, controller: AbortController): void {
        if (!this.controllers.has(key)) {
            this.controllers.set(key, new Set());
        }

        this.controllers.get(key)!.add(controller);
    }

    private untrackController(key: string, controller: AbortController): void {
        const bucket = this.controllers.get(key);
        if (!bucket) {
            return;
        }

        bucket.delete(controller);
        if (bucket.size === 0) {
            this.controllers.delete(key);
        }
    }

    private abortKey(key: string): void {
        const bucket = this.controllers.get(key);
        if (!bucket) {
            return;
        }

        for (const controller of bucket) {
            controller.abort();
        }

        this.controllers.delete(key);
    }
}

export class TinyRequestError extends Error {
    response: Response;
    status: number;

    constructor(response: Response) {
        super(`Request failed with status ${response.status}`);
        this.name = 'TinyRequestError';
        this.response = response;
        this.status = response.status;
    }
}

export const request = new TinyRequest();
