import { createProjectsStore } from '@video-voice-translator/store';
import { apiClient } from '@/libs/api';

export const useProjectsStore = createProjectsStore(apiClient);
