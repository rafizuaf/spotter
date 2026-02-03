import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Platform } from 'react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { useTheme } from '../../src/hooks/useTheme';
import SocialLoginButton from '../../src/components/SocialLoginButton';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loginWithOAuth, isLoading, error, clearError } = useAuthStore();
  const colors = useTheme();

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    try {
      await loginWithOAuth(provider);
      router.replace('/(tabs)');
    } catch {
      // Error is handled by the store
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      return;
    }

    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.primary }]}>Spotter</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Track your gains</Text>
        </View>

        <View style={styles.form}>
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: colors.error }]}>
              <Text style={[styles.errorText, { color: colors.textPrimary }]}>{error}</Text>
              <TouchableOpacity onPress={clearError}>
                <Text style={[styles.errorDismiss, { color: colors.textPrimary }]}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.background }]}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or continue with</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.socialButtons}>
            <SocialLoginButton
              provider="google"
              onPress={() => handleSocialLogin('google')}
              isLoading={isLoading}
            />
            <SocialLoginButton
              provider="facebook"
              onPress={() => handleSocialLogin('facebook')}
              isLoading={isLoading}
            />
            {Platform.OS === 'ios' && (
              <SocialLoginButton
                provider="apple"
                onPress={() => handleSocialLogin('apple')}
                isLoading={isLoading}
              />
            )}
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={[styles.link, { color: colors.primary }]}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
  },
  form: {
    gap: 16,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 16,
  },
  link: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
  },
  errorDismiss: {
    fontWeight: '600',
    marginLeft: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
  },
  socialButtons: {
    gap: 12,
  },
});
