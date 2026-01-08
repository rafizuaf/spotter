import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { database, pushDevicesCollection, notificationsCollection } from '../db';
import { Q } from '@nozbe/watermelondb';
import { syncDatabase } from '../db/sync';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  notificationId?: string;
  type?: string;
  workoutId?: string;
  userId?: string;
  achievementCode?: string;
  [key: string]: string | undefined; // Index signature for compatibility
}

/**
 * Get the Expo project ID from config
 */
function getProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId;
}

/**
 * Request notification permissions and register device
 */
export async function registerForPushNotifications(
  userId: string
): Promise<string | null> {
  // Check if we can receive push notifications on this device
  if (Platform.OS === 'web') {
    console.log('Push notifications not supported on web');
    return null;
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Get Expo push token
  try {
    const projectId = getProjectId();
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
    const expoPushToken = tokenData.data;

    // Save token to local database
    await saveDeviceToken(userId, expoPushToken);

    // Sync to server
    await syncDatabase();

    console.log('Push token registered:', expoPushToken);
    return expoPushToken;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Save device token to local database
 */
async function saveDeviceToken(
  userId: string,
  expoPushToken: string
): Promise<void> {
  // Check if token already exists
  const existing = await pushDevicesCollection
    .query(
      Q.where('user_id', userId),
      Q.where('expo_push_token', expoPushToken),
      Q.where('deleted_at', null)
    )
    .fetch();

  if (existing.length > 0) {
    // Token already registered
    return;
  }

  // Check for soft-deleted record to restore
  const softDeleted = await pushDevicesCollection
    .query(
      Q.where('user_id', userId),
      Q.where('expo_push_token', expoPushToken)
    )
    .fetch();

  if (softDeleted.length > 0) {
    // Restore soft-deleted record
    await database.write(async () => {
      await softDeleted[0].update((record) => {
        record.deletedAt = undefined;
      });
    });
    return;
  }

  // Create new record
  await database.write(async () => {
    await pushDevicesCollection.create((record) => {
      record.serverId = `${userId}-${Date.now()}`;
      record.userId = userId;
      record.expoPushToken = expoPushToken;
    });
  });
}

/**
 * Unregister device token (call on logout)
 */
export async function unregisterPushNotifications(
  userId: string
): Promise<void> {
  try {
    const devices = await pushDevicesCollection
      .query(Q.where('user_id', userId), Q.where('deleted_at', null))
      .fetch();

    await database.write(async () => {
      for (const device of devices) {
        await device.update((record) => {
          record.deletedAt = new Date();
        });
      }
    });

    await syncDatabase();
  } catch (error) {
    console.error('Error unregistering push notifications:', error);
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<void> {
  try {
    const notification = await notificationsCollection.find(notificationId);

    await database.write(async () => {
      await notification.update((record) => {
        record.readAt = new Date();
      });
    });

    await syncDatabase();
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<void> {
  try {
    const unreadNotifications = await notificationsCollection
      .query(
        Q.where('recipient_id', userId),
        Q.where('read_at', null),
        Q.where('deleted_at', null)
      )
      .fetch();

    const now = new Date();
    await database.write(async () => {
      for (const notification of unreadNotifications) {
        await notification.update((record) => {
          record.readAt = now;
        });
      }
    });

    await syncDatabase();
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const unread = await notificationsCollection
    .query(
      Q.where('recipient_id', userId),
      Q.where('read_at', null),
      Q.where('deleted_at', null)
    )
    .fetchCount();

  return unread;
}

/**
 * Handle notification tap - navigate to relevant screen
 */
export function handleNotificationNavigation(data: NotificationData): void {
  const { type, userId, notificationId } = data;

  // Mark as read if we have the ID
  if (notificationId) {
    markNotificationAsRead(notificationId);
  }

  // Navigate based on notification type
  switch (type) {
    case 'FOLLOW':
      if (userId) {
        router.push(`/users/${userId}`);
      } else {
        router.push('/(tabs)/feed');
      }
      break;
    case 'PR':
    case 'ACHIEVEMENT':
    case 'LEVEL_UP':
      // Navigate to profile to see achievements
      router.push('/(tabs)/profile');
      break;
    case 'WORKOUT':
      // Navigate to history (no individual workout view route exists yet)
      router.push('/(tabs)/history');
      break;
    default:
      // Default to feed screen
      router.push('/(tabs)/feed');
  }
}

/**
 * Setup notification listeners (call in app root)
 */
export function setupNotificationListeners(): () => void {
  // Handle notification received while app is in foreground
  const notificationSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('Notification received:', notification);
      // Sync to get latest notifications
      syncDatabase();
    }
  );

  // Handle notification tapped
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content
        .data as NotificationData;
      handleNotificationNavigation(data);
    });

  // Return cleanup function
  return () => {
    notificationSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Update badge count
 */
export async function updateBadgeCount(count: number): Promise<void> {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    await Notifications.setBadgeCountAsync(count);
  }
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: NotificationData
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: (data || {}) as Record<string, unknown>,
    },
    trigger: null, // Send immediately
  });
  return id;
}

export default {
  registerForPushNotifications,
  unregisterPushNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  handleNotificationNavigation,
  setupNotificationListeners,
  updateBadgeCount,
  scheduleLocalNotification,
};
