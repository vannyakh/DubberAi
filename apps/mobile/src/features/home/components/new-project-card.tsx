import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppSymbol } from '@/components';
import { appTheme } from '@/constants/app-theme';
import { fontSizes, radius, spacing } from '@/constants';

interface Props {
  onPress: () => void;
  loading?: boolean;
}

export function NewProjectCard({ onPress, loading }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      disabled={loading}
      accessibilityLabel="Create new project"
    >
      <View style={styles.iconWrap}>
        <AppSymbol name="add" size={28} tintColor={appTheme.accentText} />
      </View>
      <Text style={styles.title}>{loading ? 'Creating project…' : 'New project'}</Text>
      <Text style={styles.subtitle}>Select video or photo footage to start editing</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'column',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: appTheme.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: appTheme.border,
    gap: spacing.sm,
  },
  cardPressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: appTheme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: appTheme.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: appTheme.textSecondary,
    lineHeight: 16,
    textAlign: 'center',
    maxWidth: 260,
  },
});
