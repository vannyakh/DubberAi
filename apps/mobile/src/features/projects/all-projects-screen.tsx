import React, { useEffect } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AppSymbol, ErrorText, Screen } from '@/components';
import { appTheme } from '@/constants/app-theme';
import { fontSizes, spacing } from '@/constants';
import { ProjectCard } from '@/features/home';
import { useProjectsStore } from '@/stores';

export function AllProjectsScreen() {
  const router = useRouter();
  const { projects, loading, error, fetch, remove } = useProjectsStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Delete project', `Remove "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(id) },
    ]);
  };

  return (
    <Screen variant="light">
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <AppSymbol name="back" size={22} tintColor={appTheme.text} />
        </Pressable>
        <Text style={styles.headerTitle}>All projects</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetch} tintColor={appTheme.text} />
        }
        ListHeaderComponent={<ErrorText message={error} />}
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
                Create a project from the home screen to get started.
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: appTheme.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  listContent: {
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  listItem: {
    paddingHorizontal: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
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
