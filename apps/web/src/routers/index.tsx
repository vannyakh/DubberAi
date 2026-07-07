/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProjectsPage } from '../features/projects';
import { EditorPage } from '../features/editor';
import { PATHS } from './paths';

export { PATHS } from './paths';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={PATHS.projects} element={<ProjectsPage />} />
        <Route path={PATHS.editorPattern} element={<EditorPage />} />
        <Route path="*" element={<Navigate to={PATHS.projects} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
