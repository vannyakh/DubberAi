import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { theme } from '@/constants';
import { SessionProvider } from '@/providers';
import { useAuthStore } from '@/stores';

export default function RootLayout() {
  const user = useAuthStore((s) => s.user);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Protected guard={!!user}>
            <Stack.Screen name="index" />
            <Stack.Screen name="project/[id]" />
            <Stack.Screen name="editor/[id]" />
          </Stack.Protected>
          <Stack.Protected guard={!user}>
            <Stack.Screen name="login" />
          </Stack.Protected>
        </Stack>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
