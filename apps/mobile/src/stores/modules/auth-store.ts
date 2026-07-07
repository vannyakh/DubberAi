import { createAuthStore } from '@dubbercute/store';
import { apiClient, tokenStorage } from '@/libs/api';

export const useAuthStore = createAuthStore(apiClient, tokenStorage);
