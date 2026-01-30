import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/authStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import {
  setupNotificationListeners,
  registerForPushNotifications,
} from '../src/services/notifications';
import { initializePurchases } from '../src/services/purchases';
import { initializeMonitoring, setUserContext, clearUserContext } from '../src/services/monitoring';
import { setupShortcutListener } from '../src/services/shortcuts';
import { useTheme } from '../src/hooks/useTheme';
import { logError } from '../src/utils/errorHandler';

export default function RootLayout() {
  const { isInitialized, initialize, user } = useAuthStore();
  const colors = useTheme();

  useEffect(() => {
    // Initialize monitoring first
    initializeMonitoring();
    initialize();
  }, []);

  // Setup notification listeners
  useEffect(() => {
    const cleanup = setupNotificationListeners();
    return cleanup;
  }, []);

  // Setup shortcut/deep link listener
  useEffect(() => {
    const cleanup = setupShortcutListener();
    return cleanup;
  }, []);

  // Register for push notifications when user is authenticated
  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications(user.id);
    }
  }, [user?.id]);

  // Initialize RevenueCat when user is authenticated
  useEffect(() => {
    if (user?.id) {
      initializePurchases(user.id).catch((error) => {
        logError(error, 'revenuecat_init');
        // Don't block app initialization if RevenueCat fails
      });
      // Set user context for monitoring
      setUserContext(user.id, user.user_metadata?.username as string | undefined);
    } else {
      clearUserContext();
    }
  }, [user?.id]);

  if (!isInitialized) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
