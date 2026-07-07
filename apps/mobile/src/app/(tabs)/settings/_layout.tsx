import React, { useState } from 'react';
import { Stack } from 'expo-router';
import { SettingsHeaderInsetProvider, SettingsStackHeader } from '@/features/account';
import { appTheme } from '@/constants/app-theme';

export default function SettingsLayout() {
  const [headerHeight, setHeaderHeight] = useState(0);

  return (
    <SettingsHeaderInsetProvider value={headerHeight}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTransparent: true,
          headerShadowVisible: false,
          header: () => <SettingsStackHeader onHeightChange={setHeaderHeight} />,
          contentStyle: { backgroundColor: appTheme.background },
        }}
      >
        <Stack.Screen name="index" />
      </Stack>
    </SettingsHeaderInsetProvider>
  );
}
