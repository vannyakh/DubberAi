import { createProjectsStore } from '@dubbercute/store';
import { apiClient } from '@/libs/api';

export const useProjectsStore = createProjectsStore(apiClient);
