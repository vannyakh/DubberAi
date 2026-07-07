import React, { useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ErrorText, Screen, TextField } from '@/components';
import { fontSizes, radius, spacing, theme } from '@/constants';
import { useAuthStore, useProjectsStore } from '@/stores';

export function ProjectsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { projects, loading, error, fetch, create, remove } = useProjectsStore();
  const [newName, setNewName] = useState('');

  useEffect(() => {
    fetch();
  }, [fetch]);

  const addProject = async () => {
    if (!newName.trim()) return;
    await create(newName.trim());
    setNewName('');
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Projects</Text>
            <Text style={styles.subtitle}>{user?.email}</Text>
          </View>
          <TouchableOpacity onPress={logout}>
            <Text style={styles.logout}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.addRow}>
          <TextField
            style={styles.input}
            placeholder="New project name"
            value={newName}
            onChangeText={setNewName}
          />
          <Button title="Add" onPress={addProject} style={styles.addButton} />
        </View>

        <ErrorText message={error} />

        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetch} />}
          ListEmptyComponent={
            !loading ? <Text style={styles.empty}>No projects yet. Create one above.</Text> : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/project/[id]', params: { id: item.id } })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>
                  {item.targetLang ? `Translated to ${item.targetLang}` : 'Not translated yet'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => remove(item.id)}>
                <Text style={styles.delete}>Delete</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: theme.colors.textMuted,
  },
  logout: {
    color: theme.colors.accent,
    fontSize: fontSizes.sm,
  },
  addRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.sm,
  },
  addButton: {
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  empty: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  cardMeta: {
    color: theme.colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  delete: {
    color: theme.colors.danger,
    fontSize: fontSizes.xs,
  },
});
