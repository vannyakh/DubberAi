import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import { StyleSheet } from 'react-native';
import { appTheme } from '@/constants/app-theme';
import { fontSizes, spacing } from '@/constants';

export default function TabsWebLayout() {
  return (
    <Tabs>
      <TabSlot />
      <TabList style={styles.tabList}>
        <TabTrigger name="home" href="/home" style={styles.tab}>
          Home
        </TabTrigger>
        <TabTrigger name="settings" href="/settings" style={styles.tab}>
          Account
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabList: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.md,
    backgroundColor: appTheme.surface,
    borderTopWidth: 1,
    borderTopColor: appTheme.border,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: appTheme.text,
  },
});
