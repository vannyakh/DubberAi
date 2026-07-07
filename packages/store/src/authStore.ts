import { create } from 'zustand';
import { ApiClient } from '@video-voice-translator/api-client';
import { Credentials, RegisterInput, TokenStorage } from '@video-voice-translator/auth';
import { User } from '@video-voice-translator/types';

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  /** Restore session from token storage on app start. */
  restore: () => Promise<void>;
  login: (credentials: Credentials) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Shared auth store factory. Each app supplies its ApiClient and a
 * platform-appropriate TokenStorage (localStorage, SecureStore, ...).
 */
export function createAuthStore(client: ApiClient, storage: TokenStorage) {
  return create<AuthState>((set) => ({
    user: null,
    token: null,
    loading: false,
    error: null,

    restore: async () => {
      const token = await storage.get();
      if (!token) return;
      set({ token, loading: true });
      try {
        const user = await client.me();
        set({ user, loading: false });
      } catch {
        await storage.clear();
        set({ user: null, token: null, loading: false });
      }
    },

    login: async (credentials) => {
      set({ loading: true, error: null });
      try {
        const session = await client.login(credentials);
        await storage.set(session.token);
        set({ user: session.user, token: session.token, loading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Login failed', loading: false });
        throw err;
      }
    },

    register: async (input) => {
      set({ loading: true, error: null });
      try {
        const session = await client.register(input);
        await storage.set(session.token);
        set({ user: session.user, token: session.token, loading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Registration failed', loading: false });
        throw err;
      }
    },

    logout: async () => {
      await storage.clear();
      set({ user: null, token: null, error: null });
    },
  }));
}
