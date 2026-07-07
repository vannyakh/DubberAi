import { Stack } from 'expo-router';
import { editorTheme } from '@/constants/editor-theme';
import { EditorStackHeader } from '@/features/editor';

export default function EditorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: 'transparent' },
        header: () => <EditorStackHeader />,
        contentStyle: { flex: 1, backgroundColor: editorTheme.background },
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          contentStyle: { flex: 1 },
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />
    </Stack>
  );
}
