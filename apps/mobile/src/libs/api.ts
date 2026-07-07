import { ApiClient } from '@dubbercut/api-client';
import { createMemoryTokenStorage, TokenStorage } from '@dubbercut/auth';

/**
 * Set EXPO_PUBLIC_API_URL in .env / eas.json to point at your API.
 * On Android emulators use http://10.0.2.2:4000 to reach the host machine.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

// Swap for an expo-secure-store adapter to persist sessions across restarts.
export const tokenStorage: TokenStorage = createMemoryTokenStorage();

export const apiClient = new ApiClient({
  baseUrl: API_URL,
  getToken: () => tokenStorage.get(),
});
