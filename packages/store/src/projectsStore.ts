import { create } from 'zustand';
import { ApiClient } from '@dubbercute/api-client';
import { Project } from '@dubbercute/types';

export interface ProjectsState {
  projects: Project[];
  loading: boolean;
  error: string | null;

  fetch: () => Promise<void>;
  create: (name: string) => Promise<Project>;
  update: (id: string, input: Partial<Project>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function createProjectsStore(client: ApiClient) {
  return create<ProjectsState>((set, get) => ({
    projects: [],
    loading: false,
    error: null,

    fetch: async () => {
      set({ loading: true, error: null });
      try {
        const projects = await client.listProjects();
        set({ projects, loading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Failed to load projects', loading: false });
      }
    },

    create: async (name) => {
      const project = await client.createProject({ name });
      set({ projects: [project, ...get().projects] });
      return project;
    },

    update: async (id, input) => {
      const updated = await client.updateProject(id, input);
      set({ projects: get().projects.map((p) => (p.id === id ? updated : p)) });
    },

    remove: async (id) => {
      await client.deleteProject(id);
      set({ projects: get().projects.filter((p) => p.id !== id) });
    },
  }));
}
