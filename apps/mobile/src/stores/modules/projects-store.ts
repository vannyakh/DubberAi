import { create } from 'zustand';
import { createProjectsStore, ProjectsState } from '@dubbercut/store';
import { Project } from '@dubbercut/types';
import { apiClient } from '@/libs/api';
import { readJson, writeJson } from '@/libs/local-storage';
import { isCloudMode } from './app-store';

const cloudStore = createProjectsStore(apiClient);
const LOCAL_KEY = 'projects.json';

function newLocalId(): string {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

async function loadLocalProjects(): Promise<Project[]> {
  return (await readJson<Project[]>(LOCAL_KEY)) ?? [];
}

async function saveLocalProjects(projects: Project[]): Promise<void> {
  await writeJson(LOCAL_KEY, projects);
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      if (isCloudMode()) {
        await cloudStore.getState().fetch();
        set({ projects: cloudStore.getState().projects, loading: false });
        return;
      }
      const projects = await loadLocalProjects();
      set({ projects, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load projects',
        loading: false,
      });
    }
  },

  create: async (name) => {
    if (isCloudMode()) {
      const project = await cloudStore.getState().create(name);
      set({ projects: cloudStore.getState().projects });
      return project;
    }

    const project: Project = {
      id: newLocalId(),
      name,
      createdAt: new Date().toISOString(),
    };
    const projects = [project, ...get().projects];
    await saveLocalProjects(projects);
    set({ projects });
    return project;
  },

  update: async (id, input) => {
    if (isCloudMode()) {
      await cloudStore.getState().update(id, input);
      set({ projects: cloudStore.getState().projects });
      return;
    }

    const projects = get().projects.map((p) =>
      p.id === id ? { ...p, ...input, id: p.id, createdAt: p.createdAt } : p,
    );
    await saveLocalProjects(projects);
    set({ projects });
  },

  remove: async (id) => {
    if (isCloudMode()) {
      await cloudStore.getState().remove(id);
      set({ projects: cloudStore.getState().projects });
      return;
    }

    const projects = get().projects.filter((p) => p.id !== id);
    await saveLocalProjects(projects);
    set({ projects });
  },
}));
