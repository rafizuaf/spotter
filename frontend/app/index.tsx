import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../src/stores/authStore';
import { userSettingsCollection } from '../src/db';
import { Q } from '@nozbe/watermelondb';
import { useTheme } from '../src/hooks/useTheme';

export default function Index() {
  const { user, isInitialized } = useAuthStore();
  const colors = useTheme();
  const router = useRouter();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user || !isInitialized) {
        setCheckingOnboarding(false);
        return;
      }

      try {
        const settings = await userSettingsCollection
          .query(Q.where('user_id', user.id))
          .fetch();

        if (settings.length === 0 || !settings[0].onboardingCompleted) {
          setNeedsOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
        // Default to needing onboarding if check fails
        setNeedsOnboarding(true);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [user, isInitialized]);

  // Navigate when onboarding check completes
  useEffect(() => {
    if (checkingOnboarding || !isInitialized) return;

    if (user) {
      if (needsOnboarding) {
        router.replace('/(auth)/onboarding' as never);
      } else {
        router.replace('/(tabs)');
      }
    } else {
      router.replace('/(auth)/login');
    }
  }, [user, needsOnboarding, checkingOnboarding, isInitialized, router]);

  // Show loading while checking auth and onboarding
  return (
    <View style={[styles.loading, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
