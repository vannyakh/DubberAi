import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { validateEmail, validatePassword } from '@dubbercut/auth';
import { authTheme } from '@/constants/auth-theme';
import { fontSizes, spacing } from '@/constants';
import { useAppStore, useAuthStore } from '@/stores';
import { AuthProviderButton } from './components/auth-provider-button';
import { AuthScreenLayout } from './components/auth-screen-layout';
import { AuthTextField } from './components/auth-text-field';
import { AppSymbol } from '@/components';

export function AuthEmailScreen() {
  const router = useRouter();
  const { login, register, loading, error } = useAuthStore();
  const enterCloudMode = useAppStore((s) => s.enterCloudMode);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !loading,
    [email, password, loading],
  );

  const submit = async () => {
    const emailIssue = validateEmail(email);
    const passwordIssue = validatePassword(password);
    setEmailError(emailIssue);
    setPasswordError(passwordIssue);
    if (emailIssue || passwordIssue) return;

    try {
      if (mode === 'login') await login({ email, password });
      else await register({ email, password });
      await enterCloudMode();
      router.replace('/');
    } catch {
      // Store surfaces API errors.
    }
  };

  return (
    <AuthScreenLayout>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Go back">
            <AppSymbol name="back" size={24} tintColor={authTheme.textDark} />
          </Pressable>
          <Text style={styles.title}>{mode === 'login' ? 'Sign in' : 'Sign up'}</Text>
          <Pressable hitSlop={12} accessibilityLabel="Help">
            <AppSymbol name="help" size={22} tintColor={authTheme.textMuted} />
          </Pressable>
        </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>DC</Text>
          </View>
          <Text style={styles.logoText}>DubberCut</Text>
        </View>

        <AuthTextField
          placeholder="Enter email address"
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (emailError) setEmailError(null);
          }}
          error={emailError}
        />

        <AuthTextField
          placeholder="Enter password"
          secureTextEntry
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (passwordError) setPasswordError(null);
          }}
          error={passwordError}
        />

        {error ? <Text style={styles.apiError}>{error}</Text> : null}

        <AuthProviderButton
          label="Continue"
          variant="dark"
          onPress={submit}
          loading={loading}
          disabled={!canSubmit}
          style={StyleSheet.flatten([styles.continue, !canSubmit && styles.continueDisabled])}
        />

        {mode === 'login' ? (
          <Pressable style={styles.centerLink}>
            <Text style={styles.mutedLink}>Forgot password?</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
          style={styles.signUpWrap}
        >
          <Text style={styles.signUpText}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <Text style={styles.signUpAction}>{mode === 'login' ? 'Sign up' : 'Sign in'}</Text>
          </Text>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    minHeight: 44,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: authTheme.textDark,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xxl,
    gap: spacing.md,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: authTheme.buttonDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIconText: {
    color: authTheme.buttonDarkText,
    fontWeight: '800',
    fontSize: fontSizes.xs,
  },
  logoText: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: authTheme.textDark,
  },
  apiError: {
    color: authTheme.danger,
    fontSize: fontSizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  continue: {
    marginTop: spacing.sm,
  },
  continueDisabled: {
    opacity: 0.35,
  },
  centerLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  mutedLink: {
    color: authTheme.accent,
    fontSize: fontSizes.sm,
  },
  signUpWrap: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  signUpText: {
    color: authTheme.textMuted,
    fontSize: fontSizes.sm,
  },
  signUpAction: {
    color: authTheme.accent,
    fontWeight: '600',
  },
});
