/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useStudio } from '../hooks/useStudio';
import { StudioPage } from './StudioPage';
import { UploadStage } from '../components/UploadStage';

/**
 * Editor page for the active project. Shows the import stage until the
 * project has media, then the full studio editor.
 */
export const EditorPage: React.FC = () => {
  const { videoUrl } = useStudio();
  return videoUrl ? <StudioPage /> : <UploadStage />;
};
