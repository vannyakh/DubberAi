import React, { useEffect, useMemo } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorText, Screen } from '@/components';
import { appTheme } from '@/constants/app-theme';
import { fontSizes, spacing } from '@/constants';
import {
  CloudPromoCard,
  MediaPickerModal,
  NewProjectCard,
  ProjectCard,
  useCreateProject,
} from '@/features/home';
import { useAppStore, useProjectsStore } from '@/stores';

const PREVIEW_COUNT = 3;

const HEADER_BAR_HEIGHT = 44;

export function ProjectsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mode = useAppStore((s) => s.mode);
  const { projects, loading, error, fetch, remove } = useProjectsStore();
  const { creating, startNewProject, pickerVisible, closePicker, confirmPicker } = useCreateProject();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const previewProjects = useMemo(() => projects.slice(0, PREVIEW_COUNT), [projects]);

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Delete project', `Remove "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(id) },
    ]);
  };

  return (
    <Screen variant="light" edges={[]}>
      <FlatList
        data={previewProjects}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetch} tintColor={appTheme.text} />
        }
        contentContainerStyle={[
          styles.listContent,
          Platform.OS === 'android' && { paddingTop: insets.top + HEADER_BAR_HEIGHT },
        ]}
        ListHeaderComponent={
          <>
            <NewProjectCard onPress={startNewProject} loading={creating} />
            {mode === 'local' ? (
              <CloudPromoCard onPress={() => router.push('/login')} />
            ) : null}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Project history</Text>
              {projects.length > 0 ? (
                <Pressable
                  onPress={() => router.push('/projects')}
                  hitSlop={8}
                  accessibilityLabel="See all projects"
                >
                  <Text style={styles.seeAll}>See all</Text>
                </Pressable>
              ) : null}
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
        showsVerticalScrollIndicator={false}
      />
      <MediaPickerModal
        visible={pickerVisible}
        adding={creating}
        onClose={closePicker}
        onConfirm={confirmPicker}
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
  seeAll: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: appTheme.textSecondary,
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
