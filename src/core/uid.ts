const uidMap = new Map<string, number>();

/**
 * Generate a scoped UID like:
 */
export function generateUID(scope: string): string {
    const count = (uidMap.get(scope) ?? 0) + 1;
    uidMap.set(scope, count);
    return `${scope}-${count}`;
}

/**
 * Register an existing UID from DOM
 * (used for SSR hydration)
 */
export function registerUID(uid: string): void {
    const match = uid.match(/^(.*)-(\d+)$/);
    if (!match) return;

    const [, scope, num] = match;
    const n = Number(num);

    if (!Number.isNaN(n)) {
        const current = uidMap.get(scope) ?? 0;
        if (n > current) {
            uidMap.set(scope, n);
        }
    }
}

/**
 * Reset all UID counters (tests / HMR)
 */
export function resetUID(): void {
    uidMap.clear();
}
