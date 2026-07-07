import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { theme } from '@/constants';
import { SessionProvider } from '@/providers';
import { useAppStore, useAuthStore } from '@/stores';

export default function RootLayout() {
  const user = useAuthStore((s) => s.user);
  const mode = useAppStore((s) => s.mode);
  const hydrated = useAppStore((s) => s.hydrated);

  const canUseApp = mode === 'local' || !!user;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <StatusBar style={canUseApp ? 'dark' : 'light'} />
        {!hydrated ? (
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
        ) : (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <Stack.Protected guard={canUseApp}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="editor/[id]" />
            </Stack.Protected>
            <Stack.Screen name="login" options={{ contentStyle: { backgroundColor: '#FFFFFF' } }} />
            <Stack.Screen
              name="login/email"
              options={{ contentStyle: { backgroundColor: '#FFFFFF' } }}
            />
          </Stack>
        )}
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
