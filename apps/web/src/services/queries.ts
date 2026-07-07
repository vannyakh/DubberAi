/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadProjectsFromFirestore, deleteProjectFromFirestore, listGoogleDriveFiles, DriveFile } from '@dubbercut/database';
import { Project } from '@dubbercut/types';

export const queryKeys = {
  projects: (userId: string) => ['projects', userId] as const,
  driveFiles: () => ['driveFiles'] as const,
};

// Hook to load projects via TanStack Query
export function useUserProjectsQuery(userId: string | undefined) {
  return useQuery<Project[], Error>({
    queryKey: queryKeys.projects(userId || ''),
    queryFn: () => loadProjectsFromFirestore(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

// Hook to delete projects via TanStack Query Mutation
export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, { projectId: string; userId: string }>({
    mutationFn: ({ projectId }) => deleteProjectFromFirestore(projectId),
    onSuccess: (_, variables) => {
      // Invalidate projects cache to trigger reload
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects(variables.userId),
      });
    },
  });
}

// Hook to fetch Google Drive files via TanStack Query
export function useGoogleDriveFilesQuery(isAuthenticated: boolean) {
  return useQuery<DriveFile[], Error>({
    queryKey: queryKeys.driveFiles(),
    queryFn: listGoogleDriveFiles,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2, // 2 minutes cache
  });
}
