import type { Router } from 'expo-router';

export function openEditor(router: Router, projectId: string) {
  router.replace({ pathname: '/editor/[id]', params: { id: projectId } });
}

export function closeEditor(router: Router) {
  router.replace('/home');
}
