import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { appTheme } from '@/constants/app-theme';
import { HomeHeaderLeft, HomeHeaderRight } from '@/features/home';

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerShadowVisible: false,
        headerTransparent: true,
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerLeft: () => <HomeHeaderLeft />,
        headerRight: () => <HomeHeaderRight />,
        contentStyle: { backgroundColor: appTheme.background },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
