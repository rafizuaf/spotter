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

interface FollowerUser {
  id: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  isFollowing: boolean;
}

export default function FollowersScreen() {
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();

  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFollowers = useCallback(async () => {
    if (!userId) return;

    try {
      // Get all users who follow this user
      const followRecords = await followsCollection
        .query(
          Q.where('following_id', userId),
          Q.where('deleted_at', null)
        )
        .fetch();

      const followerIds = followRecords.map((f) => (f as Follow).followerId);

      if (followerIds.length === 0) {
        setFollowers([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Get user data for each follower
      const followerUsers = await usersCollection
        .query(Q.where('server_id', Q.oneOf(followerIds)))
        .fetch();

      // Check which users the current user is following
      let currentUserFollowing: Set<string> = new Set();
      if (currentUser) {
        const followingRecords = await followsCollection
          .query(
            Q.where('follower_id', currentUser.id),
            Q.where('deleted_at', null)
          )
          .fetch();
        currentUserFollowing = new Set(
          followingRecords.map((f) => (f as Follow).followingId)
        );
      }

      // Map to FollowerUser interface
      const mappedFollowers = followerUsers.map((u) => {
        const user = u as User;
        return {
          id: user.serverId,
          username: user.username,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          isFollowing: currentUserFollowing.has(user.serverId),
        };
      });

      setFollowers(mappedFollowers);
    } catch (error) {
      console.error('Error loading followers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, currentUser]);

  useEffect(() => {
    loadFollowers();
  }, [loadFollowers]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await syncDatabase();
      await loadFollowers();
    } catch (error) {
      console.error('Error refreshing:', error);
      setRefreshing(false);
    }
  };

  const handleFollowChange = (targetUserId: string, isNowFollowing: boolean) => {
    setFollowers((prev) =>
      prev.map((user) =>
        user.id === targetUserId
          ? { ...user, isFollowing: isNowFollowing }
          : user
      )
    );
  };

  const renderItem = ({ item }: { item: FollowerUser }) => (
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
      <Text style={styles.emptyText}>No followers yet</Text>
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
        <Text style={styles.headerTitle}>Followers</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* List */}
      <FlatList
        data={followers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          followers.length === 0 && styles.emptyListContent,
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
