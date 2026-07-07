import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { AppSymbol } from '@/components';
import { authTheme } from '@/constants/auth-theme';
import { fontSizes, spacing } from '@/constants';
import { useAppStore } from '@/stores';
import { AuthProviderButton } from './components/auth-provider-button';
import { AuthScreenLayout } from './components/auth-screen-layout';

function HeroCard() {
  return (
    <View style={styles.heroCard}>
      <LinearGradient colors={['#2A2A2A', '#111111']} style={styles.heroGradient}>
        <AppSymbol name="film" size={56} tintColor={authTheme.accent} />
      </LinearGradient>
    </View>
  );
}

export function AuthWelcomeScreen() {
  const router = useRouter();
  const mode = useAppStore((s) => s.mode);
  const enterLocalMode = useAppStore((s) => s.enterLocalMode);

  const continueWithoutAccount = async () => {
    await enterLocalMode();
    router.replace('/home');
  };

  return (
    <AuthScreenLayout style={styles.root} variant="dark">
      <View style={styles.topBar}>
        {mode === 'local' ? (
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Go back">
            <AppSymbol name="back" size={24} tintColor={authTheme.text} />
          </Pressable>
        ) : (
          <View style={styles.topSpacer} />
        )}
        <Pressable hitSlop={12} accessibilityLabel="Help">
          <AppSymbol name="help" size={22} tintColor={authTheme.textMuted} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <HeroCard />

        <View style={styles.stats}>
          <Text style={styles.statsText}>Edit locally · Dub globally</Text>
        </View>

        <Text style={styles.headline}>
          Create stunning videos with{' '}
          <Text style={styles.headlineAccent}>AI-powered dubbing</Text> and a pro editor.
        </Text>

        <AuthProviderButton
          label="Get Started"
          variant="dark"
          onPress={continueWithoutAccount}
          style={styles.primaryCta}
        />

        <Pressable
          onPress={() => router.push('/login/email' as Href)}
          style={styles.secondaryCta}
        >
          <Text style={styles.secondaryCtaText}>Sign in with email</Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          <Pressable style={styles.socialBtn} accessibilityLabel="Sign in with Google">
            <AppSymbol name="google" size={24} tintColor={authTheme.text} />
          </Pressable>
          <Pressable style={styles.socialBtn} accessibilityLabel="Sign in with TikTok">
            <AppSymbol name="music" size={24} tintColor={authTheme.text} />
          </Pressable>
          <Pressable style={styles.socialBtn} accessibilityLabel="Sign in with Apple">
            <AppSymbol name="apple" size={24} tintColor={authTheme.text} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.legal}>
        By continuing you agree to our <Text style={styles.link}>Terms</Text> and{' '}
        <Text style={styles.link}>Privacy Policy</Text>
      </Text>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    minHeight: 44,
  },
  topSpacer: { width: 24 },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  heroCard: {
    alignSelf: 'center',
    width: 180,
    height: 240,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#333',
  },
  heroGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    alignSelf: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#333',
  },
  statsText: {
    color: authTheme.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  headline: {
    color: authTheme.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.5,
    marginBottom: spacing.xl,
  },
  headlineAccent: {
    color: authTheme.accent,
  },
  primaryCta: {
    marginBottom: spacing.sm,
  },
  secondaryCta: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  secondaryCtaText: {
    color: authTheme.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: authTheme.textMuted,
    fontSize: fontSizes.xs,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legal: {
    color: authTheme.textMuted,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: authTheme.accent,
  },
});
