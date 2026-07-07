/**
 * Platform-agnostic token persistence. Each app provides an adapter:
 * - web/desktop: createWebTokenStorage (localStorage)
 * - mobile: wrap expo-secure-store with this interface
 */
export interface TokenStorage {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}

export function createMemoryTokenStorage(): TokenStorage {
  let token: string | null = null;
  return {
    async get() {
      return token;
    },
    async set(value: string) {
      token = value;
    },
    async clear() {
      token = null;
    },
  };
}

const WEB_STORAGE_KEY = 'vvt.auth.token';

export function createWebTokenStorage(): TokenStorage {
  return {
    async get() {
      return globalThis.localStorage?.getItem(WEB_STORAGE_KEY) ?? null;
    },
    async set(token: string) {
      globalThis.localStorage?.setItem(WEB_STORAGE_KEY, token);
    },
    async clear() {
      globalThis.localStorage?.removeItem(WEB_STORAGE_KEY);
    },
  };
}
