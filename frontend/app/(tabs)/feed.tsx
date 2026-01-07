import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { socialPostsCollection, followsCollection, userBlocksCollection, usersCollection } from '../../src/db';
import { useAuthStore } from '../../src/stores/authStore';
import { syncDatabase } from '../../src/db/sync';
import type SocialPost from '../../src/db/models/SocialPost';
import type User from '../../src/db/models/User';

interface PostWithUser {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  headline: string;
  createdAt: Date;
  workoutId?: string;
  achievementCode?: string;
}

export default function FeedScreen() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFeed();

    // Subscribe to social posts changes
    const subscription = socialPostsCollection
      .query(Q.where('deleted_at', null), Q.sortBy('created_at', Q.desc))
      .observe()
      .subscribe(() => {
        loadFeed();
      });

    return () => subscription.unsubscribe();
  }, [user?.id]);

  const loadFeed = async () => {
    try {
      if (!user?.id) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // 1. Get list of users I follow
      const follows = await followsCollection
        .query(
          Q.where('follower_id', user.id),
          Q.where('deleted_at', null)
        )
        .fetch();

      const followingIds = follows.map((f) => f.followingId);

      // If not following anyone, show empty feed
      if (followingIds.length === 0) {
        setPosts([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 2. Get list of blocked users (both directions)
      const blocks = await userBlocksCollection
        .query(
          Q.or(
            Q.where('blocker_id', user.id),
            Q.where('blocked_id', user.id)
          )
        )
        .fetch();

      const blockedUserIds = new Set<string>();
      blocks.forEach((block) => {
        if (block.blockerId === user.id) {
          blockedUserIds.add(block.blockedId);
        } else {
          blockedUserIds.add(block.blockerId);
        }
      });

      // 3. Filter out blocked users from following list
      const validFollowingIds = followingIds.filter(
        (id) => !blockedUserIds.has(id)
      );

      if (validFollowingIds.length === 0) {
        setPosts([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 4. Get posts from users I follow
      const postRecords = await socialPostsCollection
        .query(
          Q.where('user_id', Q.oneOf(validFollowingIds)),
          Q.where('deleted_at', null),
          Q.sortBy('created_at', Q.desc),
          Q.take(50) // Limit to 50 most recent posts
        )
        .fetch();

      // 5. Load user data for each post
      const postsWithUsers = await Promise.all(
        postRecords.map(async (post: SocialPost) => {
          try {
            const postUser = await usersCollection
              .query(Q.where('server_id', post.userId))
              .fetch();

            const userData = postUser[0] as User | undefined;

            return {
              id: post.id,
              userId: post.userId,
              username: userData?.username || 'Unknown User',
              avatarUrl: userData?.avatarUrl,
              headline: post.generatedHeadline,
              createdAt: post.createdAt,
              workoutId: post.workoutId,
              achievementCode: post.achievementCode,
            };
          } catch (error) {
            console.error('Error loading user for post:', error);
            return null;
          }
        })
      );

      // Filter out any null posts (from errors)
      const validPosts = postsWithUsers.filter((p) => p !== null) as PostWithUser[];

      setPosts(validPosts);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await syncDatabase();
      await loadFeed();
    } catch (error) {
      console.error('Error refreshing feed:', error);
      setRefreshing(false);
    }
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const renderPost = ({ item }: { item: PostWithUser }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        {/* Avatar */}
        <View style={styles.avatar}>
          {item.avatarUrl ? (
            <Text style={styles.avatarText}>
              {item.username.charAt(0).toUpperCase()}
            </Text>
          ) : (
            <Text style={styles.avatarText}>
              {item.username.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>

        {/* User info */}
        <View style={styles.postHeaderText}>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.timestamp}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>

      {/* Post content */}
      <Text style={styles.headline}>{item.headline}</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No posts yet</Text>
      <Text style={styles.emptyText}>
        Follow other users to see their workouts and achievements in your feed
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed</Text>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          posts.length === 0 && styles.emptyListContent,
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
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
  postCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  postHeaderText: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
    color: '#94a3b8',
  },
  headline: {
    fontSize: 15,
    color: '#e2e8f0',
    lineHeight: 22,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
});
