import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { socialPostsCollection, followsCollection, userBlocksCollection, usersCollection } from '../../src/db';
import { useAuthStore } from '../../src/stores/authStore';
import { syncDatabase } from '../../src/db/sync';
import type SocialPost from '../../src/db/models/SocialPost';
import type User from '../../src/db/models/User';
import { useTheme } from '../../src/hooks/useTheme';
import ReactionBar from '../../src/components/ReactionBar';
import type { ReactionType } from '../../src/db/models/PostReaction';

interface PostWithUser {
  id: string;
  serverId: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  headline: string;
  createdAt: Date;
  workoutId?: string;
  achievementCode?: string;
  reactionCountLike: number;
  reactionCountFire: number;
  reactionCountMuscle: number;
  reactionCountClap: number;
}

export default function FeedScreen() {
  const { user } = useAuthStore();
  const colors = useTheme();
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

      // 5. FIX: Batch load all users at once using Q.oneOf() instead of N+1 queries
      // Extract unique user IDs from posts
      const userIds = Array.from(new Set(postRecords.map((p: SocialPost) => p.userId)));
      
      // Single batch query for all users
      const users = await usersCollection
        .query(Q.where('server_id', Q.oneOf(userIds)))
        .fetch();
      
      // Create Map for O(1) lookup
      const userMap = new Map<string, User>();
      users.forEach((user) => {
        const typedUser = user as User;
        if (typedUser.serverId) {
          userMap.set(typedUser.serverId, typedUser);
        }
      });

      // Map posts to users using the pre-loaded Map
      const postsWithUsers = postRecords.map((post: SocialPost) => {
        const userData = userMap.get(post.userId);

        return {
          id: post.id,
          serverId: post.serverId,
          userId: post.userId,
          username: userData?.username || 'Unknown User',
          avatarUrl: userData?.avatarUrl,
          headline: post.generatedHeadline,
          createdAt: post.createdAt,
          workoutId: post.workoutId,
          achievementCode: post.achievementCode,
          reactionCountLike: post.reactionCountLike || 0,
          reactionCountFire: post.reactionCountFire || 0,
          reactionCountMuscle: post.reactionCountMuscle || 0,
          reactionCountClap: post.reactionCountClap || 0,
        };
      });

      // Filter out any null posts (from errors)
      const validPosts = postsWithUsers.filter((p) => p !== null) as PostWithUser[];

      // Phase 2G: Batch load user reactions for all posts (optimized)
      const postServerIds = validPosts.map((p) => p.serverId);
      const userReactionsMap = new Map<string, ReactionType | null>();
      
      if (postServerIds.length > 0 && user?.id) {
        // Use batch query from reactions service
        const { getUserReactionsForPosts } = await import('../../src/services/reactions');
        const reactions = await getUserReactionsForPosts(postServerIds, user.id);
        reactions.forEach((reactionType, postId) => {
          userReactionsMap.set(postId, reactionType);
        });
      }

      // Add user reactions to posts
      const postsWithReactions = validPosts.map((post) => ({
        ...post,
        userReaction: userReactionsMap.get(post.serverId) || null,
      }));

      setPosts(postsWithReactions);
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

  const renderPost = ({ item }: { item: PostWithUser & { userReaction?: ReactionType | null } }) => (
    <View style={[styles.postCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.postHeader}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          {item.avatarUrl ? (
            <Text style={[styles.avatarText, { color: colors.background }]}>
              {item.username.charAt(0).toUpperCase()}
            </Text>
          ) : (
            <Text style={[styles.avatarText, { color: colors.background }]}>
              {item.username.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>

        {/* User info */}
        <View style={styles.postHeaderText}>
          <Text style={[styles.username, { color: colors.textPrimary }]}>{item.username}</Text>
          <Text style={[styles.timestamp, { color: colors.textSecondary }]}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>

      {/* Post content */}
      <Text style={[styles.headline, { color: colors.textPrimary }]}>{item.headline}</Text>

      {/* Phase 2G: Reaction bar */}
      <ReactionBar
        postId={item.serverId}
        reactions={{
          like: item.reactionCountLike,
          fire: item.reactionCountFire,
          muscle: item.reactionCountMuscle,
          clap: item.reactionCountClap,
        }}
        userReaction={item.userReaction || null}
      />
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No posts yet</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Follow other users to see their workouts and achievements in your feed
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Feed</Text>
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
            tintColor={colors.primary}
            colors={[colors.primary]}
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
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
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
  postCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  postHeaderText: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
  },
  headline: {
    fontSize: 15,
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
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
