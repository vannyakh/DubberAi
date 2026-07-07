import { Credentials, RegisterInput } from '@dubbercut/auth';
import { Project, RenderJob, Session, User } from '@dubbercut/types';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Returns the current auth token, or null when signed out. */
  getToken?: () => Promise<string | null> | string | null;
}

/**
 * Typed REST client for apps/api. Fetch-based, so it works in the browser,
 * Electron renderer, and React Native without changes.
 */
export class ApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = await this.options.getToken?.();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${this.options.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let message = `${method} ${path} failed with status ${response.status}`;
      try {
        const data = await response.json();
        message = data.error || data.message || message;
      } catch {
        // keep default message
      }
      throw new ApiError(response.status, message);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  // --- Auth ---

  register(input: RegisterInput): Promise<Session> {
    return this.request('POST', '/api/auth/register', input);
  }

  login(credentials: Credentials): Promise<Session> {
    return this.request('POST', '/api/auth/login', credentials);
  }

  me(): Promise<User> {
    return this.request('GET', '/api/auth/me');
  }

  // --- Projects ---

  listProjects(): Promise<Project[]> {
    return this.request('GET', '/api/projects');
  }

  getProject(id: string): Promise<Project> {
    return this.request('GET', `/api/projects/${id}`);
  }

  createProject(input: Partial<Project> & { name: string }): Promise<Project> {
    return this.request('POST', '/api/projects', input);
  }

  updateProject(id: string, input: Partial<Project>): Promise<Project> {
    return this.request('PATCH', `/api/projects/${id}`, input);
  }

  deleteProject(id: string): Promise<void> {
    return this.request('DELETE', `/api/projects/${id}`);
  }

  // --- Jobs ---

  createJob(projectId: string, kind: RenderJob['kind']): Promise<RenderJob> {
    return this.request('POST', '/api/jobs', { projectId, kind });
  }

  getJob(id: string): Promise<RenderJob> {
    return this.request('GET', `/api/jobs/${id}`);
  }

  listJobs(filter?: { status?: string; kind?: string }): Promise<RenderJob[]> {
    const params = new URLSearchParams(filter as Record<string, string>).toString();
    return this.request('GET', `/api/jobs${params ? `?${params}` : ''}`);
  }

  // --- AI ---

  translate(text: string, targetLanguage: string, sourceLanguage?: string): Promise<{ result: string }> {
    return this.request('POST', '/api/ai/translate', { text, targetLanguage, sourceLanguage });
  }

  summarize(text: string, language?: string): Promise<{ result: string }> {
    return this.request('POST', '/api/ai/summarize', { text, language });
  }

  correctGrammar(text: string, language?: string): Promise<{ result: string }> {
    return this.request('POST', '/api/ai/grammar', { text, language });
  }

  generateChapters(text: string): Promise<{ result: Array<{ start: string; title: string }> }> {
    return this.request('POST', '/api/ai/chapters', { text });
  }

  generateHashtags(text: string, count?: number): Promise<{ result: string[] }> {
    return this.request('POST', '/api/ai/hashtags', { text, count });
  }

  generateTitles(text: string, count?: number): Promise<{ result: string[] }> {
    return this.request('POST', '/api/ai/titles', { text, count });
  }
}
