import { createAuthStore } from '@video-voice-translator/store';
import { apiClient, tokenStorage } from '@/libs/api';

export const useAuthStore = createAuthStore(apiClient, tokenStorage);
