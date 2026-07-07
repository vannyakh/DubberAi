import { Redirect } from 'expo-router';
import { ProjectsScreen } from '@/features/projects';
import { useAppStore, useAuthStore } from '@/stores';

export default function ProjectsTab() {
  const user = useAuthStore((s) => s.user);
  const mode = useAppStore((s) => s.mode);

  if (mode !== 'local' && !user) {
    return <Redirect href="/login" />;
  }

  return <ProjectsScreen />;
}
