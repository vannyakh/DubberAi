import { DefaultTheme, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { appTheme } from '@/constants/app-theme';

const tabsTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: appTheme.background,
    card: appTheme.surface,
    primary: appTheme.accent,
    border: appTheme.border,
    text: appTheme.text,
  },
};

export default function TabsLayout() {
  return (
    <ThemeProvider value={tabsTheme}>
      <NativeTabs
        disableTransparentOnScrollEdge
        tintColor={appTheme.accentDark}
        backgroundColor={appTheme.surface}
        iconColor={{
          default: appTheme.textMuted,
          selected: appTheme.text,
        }}
        labelStyle={{
          default: { color: appTheme.textMuted, fontSize: 11, fontWeight: '600' },
          selected: { color: appTheme.text, fontSize: 11, fontWeight: '700' },
        }}
      >
        <NativeTabs.Trigger name="home" contentStyle={{ backgroundColor: appTheme.background }}>
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'house', selected: 'house.fill' }}
            md={{ default: 'home', selected: 'home' }}
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings" contentStyle={{ backgroundColor: appTheme.background }}>
          <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
            md={{ default: 'account_circle', selected: 'account_circle' }}
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}
