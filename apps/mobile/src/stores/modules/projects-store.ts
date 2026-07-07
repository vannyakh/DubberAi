import { createProjectsStore } from '@dubbercut/store';
import { apiClient } from '@/libs/api';

export const useProjectsStore = createProjectsStore(apiClient);
