import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
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
      console.error('Error loading notifications:', error);
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
      console.error('Error refreshing notifications:', error);
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
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptyText}>
        You will receive notifications when someone follows you, you hit a PR,
        or unlock achievements
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerStyle: {
            backgroundColor: '#0f172a',
          },
          headerTintColor: '#fff',
          headerRight: () =>
            unreadCount > 0 ? (
              <TouchableOpacity
                onPress={handleMarkAllAsRead}
                style={styles.markAllButton}
              >
                <Text style={styles.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <View style={styles.container}>
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366f1"
              colors={['#6366f1']}
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
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
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
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
});
