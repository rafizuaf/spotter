import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../src/stores/authStore';
import {
  setupNotificationListeners,
  registerForPushNotifications,
} from '../src/services/notifications';
import { initializePurchases } from '../src/services/purchases';
import { initializeMonitoring, setUserContext, clearUserContext } from '../src/services/monitoring';
import { setupShortcutListener } from '../src/services/shortcuts';
import { useTheme } from '../src/hooks/useTheme';
import { logError } from '../src/utils/errorHandler';
import { syncBackground } from '../src/db/sync'; // A4: Background sync scheduler
import { useOfflineQueueStore } from '../src/stores/offlineQueueStore'; // B7: Process offline queue on app start

export default function RootLayout() {
  const { isInitialized, initialize, user } = useAuthStore();
  const colors = useTheme();
  const { processQueue: processOfflineQueue, getPendingCount } = useOfflineQueueStore(); // B7: Offline queue

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

  // B7: Process offline queue on app start
  useEffect(() => {
    if (user?.id) {
      // Process queue when user is authenticated
      processOfflineQueue().catch((error) => {
        logError(error, 'offlineQueue_startup');
      });
      // Also update pending count
      getPendingCount().catch((error) => {
        logError(error, 'offlineQueue_getPendingCount');
      });
    }
  }, [user?.id, processOfflineQueue, getPendingCount]);

  // A4: Background sync scheduler (every 5 minutes when app is active)
  useEffect(() => {
    if (!user?.id) {
      return; // Don't sync if user not authenticated
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let appStateSubscription: { remove: () => void } | null = null;

    const scheduleBackgroundSync = () => {
      // Clear existing interval
      if (intervalId) {
        clearInterval(intervalId);
      }

      // Only schedule if app is active
      if (AppState.currentState === 'active') {
        // Sync immediately on app become active
        syncBackground().catch((error) => {
          logError(error, 'background_sync_initial');
        });

        // Then sync every 5 minutes
        intervalId = setInterval(() => {
          if (AppState.currentState === 'active') {
            syncBackground().catch((error) => {
              logError(error, 'background_sync_periodic');
            });
          }
        }, 5 * 60 * 1000); // 5 minutes
      }
    };

    // Schedule sync on mount
    scheduleBackgroundSync();

    // Reschedule when app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        scheduleBackgroundSync();
      } else {
        // Clear interval when app goes to background
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      appStateSubscription?.remove();
    };
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
