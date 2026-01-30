import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Q } from '@nozbe/watermelondb';
import { Stack } from 'expo-router';
import { notificationsCollection, usersCollection } from '../src/db';
import { useAuthStore } from '../src/stores/authStore';
import { syncDatabase } from '../src/db/sync';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  handleNotificationNavigation,
} from '../src/services/notifications';
import NotificationCard from '../src/components/NotificationCard';
import type Notification from '../src/db/models/Notification';
import type { NotificationType } from '../src/db/models/Notification';
import { useTheme } from '../src/hooks/useTheme';
import { logError } from '../src/utils/errorHandler';

interface NotificationItem {
  id: string;
  serverId: string;
  type: NotificationType;
  title: string;
  body?: string;
  actorId?: string;
  actorUsername?: string;
  isRead: boolean;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const colors = useTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      if (!user?.id) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const notificationRecords = await notificationsCollection
        .query(
          Q.where('recipient_id', user.id),
          Q.where('deleted_at', null),
          Q.sortBy('created_at', Q.desc),
          Q.take(100)
        )
        .fetch();

      // Load actor usernames
      const notificationsWithActors = await Promise.all(
        notificationRecords.map(async (notification: Notification) => {
          let actorUsername: string | undefined;

          if (notification.actorId) {
            try {
              const actors = await usersCollection
                .query(Q.where('server_id', notification.actorId))
                .fetch();
              actorUsername = actors[0]?.username;
            } catch {
              // Ignore error, username is optional
            }
          }

          return {
            id: notification.id,
            serverId: notification.serverId,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            actorId: notification.actorId,
            actorUsername,
            isRead: notification.isRead,
            createdAt: notification.createdAt,
            metadata: notification.parsedMetadata,
          };
        })
      );

      setNotifications(notificationsWithActors);
    } catch (error) {
      logError(error, 'notifications_load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();

    // Subscribe to changes
    if (!user?.id) return;

    const subscription = notificationsCollection
      .query(
        Q.where('recipient_id', user.id),
        Q.where('deleted_at', null),
        Q.sortBy('created_at', Q.desc)
      )
      .observe()
      .subscribe(() => {
        loadNotifications();
      });

    return () => subscription.unsubscribe();
  }, [user?.id, loadNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await syncDatabase();
      await loadNotifications();
    } catch (error) {
      logError(error, 'notifications_refresh');
      setRefreshing(false);
    }
  };

  const handleNotificationPress = async (id: string) => {
    const notification = notifications.find((n) => n.id === id);
    if (!notification) return;

    // Mark as read
    await markNotificationAsRead(id);

    // Navigate based on type
    handleNotificationNavigation({
      notificationId: id,
      type: notification.type,
      userId: notification.actorId,
      ...notification.metadata,
    });
  };

  const handleMarkAllAsRead = async () => {
    if (user?.id) {
      await markAllNotificationsAsRead(user.id);
      // Refresh the list to show updated read status
      await loadNotifications();
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderNotification = ({ item }: { item: NotificationItem }) => (
    <NotificationCard
      id={item.id}
      type={item.type}
      title={item.title}
      body={item.body}
      actorUsername={item.actorUsername}
      isRead={item.isRead}
      createdAt={item.createdAt}
      onPress={handleNotificationPress}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No notifications yet</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        You will receive notifications when someone follows you, you hit a PR,
        or unlock achievements
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
          headerRight: () =>
            unreadCount > 0 ? (
              <TouchableOpacity
                onPress={handleMarkAllAsRead}
                style={styles.markAllButton}
              >
                <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlashList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          estimatedItemSize={80}
          contentContainerStyle={
            notifications.length === 0
              ? { ...styles.listContent, ...styles.emptyListContent }
              : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
