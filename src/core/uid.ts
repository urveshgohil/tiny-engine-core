import { pushDevtoolsEvent } from './utils';

const uidMap = new Map<string, number>();

export function generateUID(scope: string): string {
    const count = (uidMap.get(scope) ?? 0) + 1;
    uidMap.set(scope, count);
    const uid = `${scope}-${count}`;
    pushDevtoolsEvent('uid:generated', { scope, uid });
    return uid;
}

export function registerUID(uid: string): void {
    const splitAt = uid.lastIndexOf('-');
    if (splitAt < 1 || splitAt === uid.length - 1) return;

    const scope = uid.slice(0, splitAt);
    const n = Number(uid.slice(splitAt + 1));

    if (!Number.isNaN(n)) {
        const current = uidMap.get(scope) ?? 0;
        if (n > current) {
            uidMap.set(scope, n);
        }
    }

    pushDevtoolsEvent('uid:registered', { uid });
}

export function resetUID(): void {
    uidMap.clear();
    pushDevtoolsEvent('uid:reset');
}
