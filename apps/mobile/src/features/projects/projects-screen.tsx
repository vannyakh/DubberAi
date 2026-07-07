import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ErrorText, Screen } from '@/components';
import { appTheme } from '@/constants/app-theme';
import { fontSizes, spacing } from '@/constants';
import {
  CloudPromoCard,
  createProjectFromFootage,
  HomeHeader,
  NewProjectCard,
  ProjectCard,
} from '@/features/home';
import { useAppStore, useProjectsStore } from '@/stores';

export function ProjectsScreen() {
  const router = useRouter();
  const mode = useAppStore((s) => s.mode);
  const { projects, loading, error, fetch, remove } = useProjectsStore();

  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const startNewProject = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const projectId = await createProjectFromFootage();
      if (projectId) {
        router.push({ pathname: '/editor/[id]', params: { id: projectId } });
      }
    } catch (err) {
      Alert.alert(
        'Could not create project',
        err instanceof Error ? err.message : 'Something went wrong.',
      );
    } finally {
      setCreating(false);
    }
  }, [creating, router]);

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Delete project', `Remove "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(id) },
    ]);
  };

  return (
    <Screen variant="light">
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetch} tintColor={appTheme.text} />
        }
        ListHeaderComponent={
          <>
            <HomeHeader onCreatePress={startNewProject} />
            <NewProjectCard onPress={startNewProject} loading={creating} />
            {mode === 'local' ? (
              <CloudPromoCard onPress={() => router.push('/login')} />
            ) : null}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Project history</Text>
            </View>
            <ErrorText message={error} />
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <ProjectCard
              project={item}
              onPress={() => router.push({ pathname: '/editor/[id]', params: { id: item.id } })}
              onDelete={() => confirmDelete(item.id, item.name)}
            />
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No projects yet</Text>
              <Text style={styles.emptyBody}>
                Tap New project above and choose footage from your library.
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: appTheme.text,
  },
  sectionCount: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: appTheme.textMuted,
  },
  listItem: {
    paddingHorizontal: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: appTheme.text,
  },
  emptyBody: {
    fontSize: fontSizes.sm,
    color: appTheme.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
});
