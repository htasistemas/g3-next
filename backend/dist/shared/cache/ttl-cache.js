export class TtlCache {
    ttlMs;
    maxEntries;
    store = new Map();
    inflight = new Map();
    constructor(ttlMs, maxEntries = 100) {
        this.ttlMs = ttlMs;
        this.maxEntries = maxEntries;
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry) {
            return undefined;
        }
        if (entry.expiresAt <= Date.now()) {
            this.store.delete(key);
            return undefined;
        }
        return entry.value;
    }
    set(key, value) {
        this.store.set(key, {
            value,
            expiresAt: Date.now() + this.ttlMs
        });
        if (this.store.size > this.maxEntries) {
            const oldestKey = this.store.keys().next().value;
            if (oldestKey) {
                this.store.delete(oldestKey);
            }
        }
        return value;
    }
    clear() {
        this.store.clear();
        this.inflight.clear();
    }
    async getOrSet(key, loader) {
        const cached = this.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const pending = this.inflight.get(key);
        if (pending) {
            return pending;
        }
        const promise = loader()
            .then((value) => {
            this.set(key, value);
            this.inflight.delete(key);
            return value;
        })
            .catch((error) => {
            this.inflight.delete(key);
            throw error;
        });
        this.inflight.set(key, promise);
        return promise;
    }
}
