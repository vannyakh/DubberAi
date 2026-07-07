import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { theme } from '@/constants';
import { SessionProvider } from '@/providers';
import { useAppStore, useAuthStore } from '@/stores';

export default function RootLayout() {
  const user = useAuthStore((s) => s.user);
  const mode = useAppStore((s) => s.mode);

  const canUseApp = mode === 'local' || !!user;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <StatusBar style={canUseApp ? 'dark' : 'light'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Protected guard={canUseApp}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="projects/index" />
            <Stack.Screen name="editor" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!canUseApp}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
