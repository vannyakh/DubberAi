import { createAuthStore } from '@dubbercut/store';
import { apiClient, tokenStorage } from '@/libs/api';

export const useAuthStore = createAuthStore(apiClient, tokenStorage);
