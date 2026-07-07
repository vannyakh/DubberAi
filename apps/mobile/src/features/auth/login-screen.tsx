import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { validateEmail, validatePassword } from '@video-voice-translator/auth';
import { Button, ErrorText, Screen, TextField } from '@/components';
import { fontSizes, spacing, theme } from '@/constants';
import { useAuthStore } from '@/stores';

export function LoginScreen() {
  const { login, register, loading, error } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validation, setValidation] = useState<string | null>(null);

  const submit = async () => {
    const issue = validateEmail(email) || validatePassword(password);
    setValidation(issue);
    if (issue) return;
    try {
      if (mode === 'login') await login({ email, password });
      else await register({ email, password });
    } catch {
      // error state handled by the store
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.title}>Video Voice Translator</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Sign in to your projects' : 'Create an account'}
        </Text>

        <TextField
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextField
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <ErrorText message={validation || error} />

        <Button
          title={mode === 'login' ? 'Sign In' : 'Sign Up'}
          onPress={submit}
          loading={loading}
          style={{ marginTop: spacing.sm }}
        />

        <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
          <Text style={styles.switchText}>
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  input: {
    marginBottom: spacing.md,
  },
  switchText: {
    color: theme.colors.accent,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontSize: fontSizes.sm,
  },
});
