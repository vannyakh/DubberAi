/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StudioProvider } from './context/StudioContext';
import { useStudio } from './hooks/useStudio';
import { ProjectsPage } from './pages/ProjectsPage';
import { EditorPage } from './pages/EditorPage';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function MainApp() {
  const { projectId } = useStudio();
  // Two pages, OpenCut-style: /projects (default) and /editor/[project]
  return projectId ? <EditorPage /> : <ProjectsPage />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <StudioProvider>
          <MainApp />
        </StudioProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);

