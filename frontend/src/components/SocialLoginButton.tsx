import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

type OAuthProvider = 'google' | 'facebook' | 'apple';

interface SocialLoginButtonProps {
  provider: OAuthProvider;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const PROVIDER_CONFIG: Record<
  OAuthProvider,
  { label: string; icon: keyof typeof FontAwesome5.glyphMap; color: string }
> = {
  google: {
    label: 'Continue with Google',
    icon: 'google',
    color: '#4285F4',
  },
  facebook: {
    label: 'Continue with Facebook',
    icon: 'facebook',
    color: '#1877F2',
  },
  apple: {
    label: 'Continue with Apple',
    icon: 'apple',
    color: '#000000',
  },
};

export default function SocialLoginButton({
  provider,
  onPress,
  isLoading = false,
  disabled = false,
}: SocialLoginButtonProps) {
  const colors = useTheme();
  const config = PROVIDER_CONFIG[provider];

  // Apple Sign-In is only available on iOS per Apple guidelines
  if (provider === 'apple' && Platform.OS !== 'ios') {
    return null;
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        (isLoading || disabled) && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={isLoading || disabled}
      accessibilityLabel={config.label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isLoading || disabled }}
    >
      {isLoading ? (
        <ActivityIndicator color={config.color} size="small" />
      ) : (
        <>
          <FontAwesome5 name={config.icon} size={20} color={config.color} />
          <Text style={[styles.buttonText, { color: colors.textPrimary }]}>{config.label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
