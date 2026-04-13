import React, { useState } from 'react';
import { StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/lib/auth';

export default function AuthScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const result = await fn(email.trim(), password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (mode === 'signup') {
      setError(null);
      // Supabase may require email confirmation depending on project settings.
      // If email confirmation is disabled, the user is auto-signed-in.
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Study Tool</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {mode === 'signin' ? 'Sign in to sync your progress' : 'Create an account'}
        </Text>

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Password"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && (
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.primary, opacity: pressed || loading ? 0.8 : 1 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFF9F4" size="small" />
          ) : (
            <Text style={styles.buttonText}>
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}>
          <Text style={[styles.switchText, { color: colors.primary }]}>
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    paddingHorizontal: 32,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Medium',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFF9F4',
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.3,
  },
  switchText: {
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
