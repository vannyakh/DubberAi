import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { theme } from '@/constants';
import { useAppStore, useAuthStore } from '@/stores';

/** App entry — waits for persisted state, then routes to home or auth. */
export default function BootstrapIndex() {
  const user = useAuthStore((s) => s.user);
  const mode = useAppStore((s) => s.mode);
  const hydrated = useAppStore((s) => s.hydrated);

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  const canUseApp = mode === 'local' || !!user;

  if (canUseApp) {
    return <Redirect href="/home" />;
  }

  return <Redirect href="/login" />;
}
