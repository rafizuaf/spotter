import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import {
  followsCollection,
  usersCollection,
} from '../../../src/db';
import { useAuthStore } from '../../../src/stores/authStore';
import { syncDatabase } from '../../../src/db/sync';
import UserListItem from '../../../src/components/UserListItem';
import type User from '../../../src/db/models/User';
import type Follow from '../../../src/db/models/Follow';

interface FollowingUser {
  id: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  isFollowing: boolean;
}

export default function FollowingScreen() {
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();

  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFollowing = useCallback(async () => {
    if (!userId) return;

    try {
      // Get all users that this user follows
      const followRecords = await followsCollection
        .query(
          Q.where('follower_id', userId),
          Q.where('deleted_at', null)
        )
        .fetch();

      const followingIds = followRecords.map((f) => (f as Follow).followingId);

      if (followingIds.length === 0) {
        setFollowing([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Get user data for each following
      const followingUsers = await usersCollection
        .query(Q.where('server_id', Q.oneOf(followingIds)))
        .fetch();

      // Check which users the current user is following
      let currentUserFollowing: Set<string> = new Set();
      if (currentUser) {
        const currentUserFollowRecords = await followsCollection
          .query(
            Q.where('follower_id', currentUser.id),
            Q.where('deleted_at', null)
          )
          .fetch();
        currentUserFollowing = new Set(
          currentUserFollowRecords.map((f) => (f as Follow).followingId)
        );
      }

      // Map to FollowingUser interface
      const mappedFollowing = followingUsers.map((u) => {
        const user = u as User;
        return {
          id: user.serverId,
          username: user.username,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          isFollowing: currentUserFollowing.has(user.serverId),
        };
      });

      setFollowing(mappedFollowing);
    } catch (error) {
      console.error('Error loading following:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, currentUser]);

  useEffect(() => {
    loadFollowing();
  }, [loadFollowing]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await syncDatabase();
      await loadFollowing();
    } catch (error) {
      console.error('Error refreshing:', error);
      setRefreshing(false);
    }
  };

  const handleFollowChange = (targetUserId: string, isNowFollowing: boolean) => {
    setFollowing((prev) =>
      prev.map((user) =>
        user.id === targetUserId
          ? { ...user, isFollowing: isNowFollowing }
          : user
      )
    );
  };

  const renderItem = ({ item }: { item: FollowingUser }) => (
    <UserListItem
      userId={item.id}
      username={item.username}
      avatarUrl={item.avatarUrl}
      bio={item.bio}
      isFollowing={item.isFollowing}
      isCurrentUser={item.id === currentUser?.id}
      onFollowChange={handleFollowChange}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Not following anyone yet</Text>
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Following</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* List */}
      <FlatList
        data={following}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          following.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
        ListEmptyComponent={renderEmpty}
      />
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  backButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
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
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
});
