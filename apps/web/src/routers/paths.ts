/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Route path patterns and builders, OpenCut-style. */
export const PATHS = {
  projects: '/projects',
  editorPattern: '/editor/:projectId',
  editor: (projectId: string) => `/editor/${projectId}`,
} as const;
