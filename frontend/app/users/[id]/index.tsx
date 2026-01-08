import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import {
  database,
  usersCollection,
  followsCollection,
  userBlocksCollection,
  workoutsCollection,
  userLevelsCollection,
  userBadgesCollection,
} from '../../../src/db';
import { useAuthStore } from '../../../src/stores/authStore';
import { supabase } from '../../../src/services/supabase';
import { syncDatabase } from '../../../src/db/sync';
import BadgeCard from '../../../src/components/BadgeCard';
import type User from '../../../src/db/models/User';
import type UserLevel from '../../../src/db/models/UserLevel';
import type UserBadge from '../../../src/db/models/UserBadge';
import type Achievement from '../../../src/db/models/Achievement';
import type Workout from '../../../src/db/models/Workout';

interface BadgeWithAchievement {
  id: string;
  achievementCode: string;
  earnedAt: Date;
  isRusty: boolean;
  achievement?: Achievement;
}

interface RecentWorkout {
  id: string;
  name: string;
  startedAt: Date;
  endedAt?: Date;
}

export default function UserProfileScreen() {
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [badges, setBadges] = useState<BadgeWithAchievement[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  const loadUserProfile = useCallback(async () => {
    if (!userId) return;

    try {
      // Load user data
      const users = await usersCollection
        .query(Q.where('server_id', userId))
        .fetch();

      if (users.length === 0) {
        setLoading(false);
        return;
      }

      setProfileUser(users[0] as User);

      // Load user level
      const levels = await userLevelsCollection
        .query(Q.where('user_id', userId))
        .fetch();
      setUserLevel(levels[0] as UserLevel || null);

      // Load badges with achievement details
      const userBadges = await userBadgesCollection
        .query(
          Q.where('user_id', userId),
          Q.where('deleted_at', null),
          Q.sortBy('earned_at', Q.desc),
          Q.take(6) // Show max 6 badges
        )
        .fetch();

      const badgesWithAchievements = await Promise.all(
        userBadges.map(async (badge) => {
          const typedBadge = badge as UserBadge;
          const achievements = await database.collections
            .get('achievements')
            .query(Q.where('code', typedBadge.achievementCode))
            .fetch();

          return {
            id: typedBadge.id,
            achievementCode: typedBadge.achievementCode,
            earnedAt: typedBadge.earnedAt,
            isRusty: typedBadge.isRusty,
            achievement: achievements[0] as Achievement | undefined,
          };
        })
      );
      setBadges(badgesWithAchievements);

      // Load recent public workouts
      const workouts = await workoutsCollection
        .query(
          Q.where('user_id', userId),
          Q.where('visibility', 'PUBLIC'),
          Q.where('deleted_at', null),
          Q.sortBy('started_at', Q.desc),
          Q.take(5)
        )
        .fetch();

      setRecentWorkouts(
        workouts.map((w) => {
          const workout = w as Workout;
          return {
            id: workout.id,
            name: workout.name || 'Workout',
            startedAt: workout.startedAt,
            endedAt: workout.endedAt,
          };
        })
      );

      // Load followers count
      const followers = await followsCollection
        .query(
          Q.where('following_id', userId),
          Q.where('deleted_at', null)
        )
        .fetchCount();
      setFollowersCount(followers);

      // Load following count
      const following = await followsCollection
        .query(
          Q.where('follower_id', userId),
          Q.where('deleted_at', null)
        )
        .fetchCount();
      setFollowingCount(following);

      // Check if current user is following this user
      if (currentUser && !isOwnProfile) {
        const followRelation = await followsCollection
          .query(
            Q.where('follower_id', currentUser.id),
            Q.where('following_id', userId),
            Q.where('deleted_at', null)
          )
          .fetch();
        setIsFollowing(followRelation.length > 0);

        // Check if blocked
        const blockRelation = await userBlocksCollection
          .query(
            Q.or(
              Q.and(
                Q.where('blocker_id', currentUser.id),
                Q.where('blocked_id', userId)
              ),
              Q.and(
                Q.where('blocker_id', userId),
                Q.where('blocked_id', currentUser.id)
              )
            )
          )
          .fetch();
        setIsBlocked(blockRelation.length > 0);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, currentUser, isOwnProfile]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await syncDatabase();
      await loadUserProfile();
    } catch (error) {
      console.error('Error refreshing:', error);
      setRefreshing(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !userId) return;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('follow-user', {
        body: { followingId: userId },
      });

      if (error) throw error;

      if (data?.success || data?.message === 'Already following') {
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
        await syncDatabase();
      }
    } catch (error) {
      console.error('Error following user:', error);
      Alert.alert('Error', 'Failed to follow user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!currentUser || !userId) return;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('unfollow-user', {
        body: { followingId: userId },
      });

      if (error) throw error;

      if (data?.success) {
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
        await syncDatabase();
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
      Alert.alert('Error', 'Failed to unfollow user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!currentUser || !userId) return;

    Alert.alert(
      'Block User',
      `Are you sure you want to block @${profileUser?.username || 'this user'}? They won't be able to see your content or follow you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { data, error } = await supabase.functions.invoke('block-user', {
                body: { blockedId: userId },
              });

              if (error) throw error;

              if (data?.success) {
                setIsBlocked(true);
                setIsFollowing(false);
                await syncDatabase();
                Alert.alert('Blocked', 'User has been blocked');
              }
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', 'Failed to block user');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleUnblock = async () => {
    if (!currentUser || !userId) return;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('unblock-user', {
        body: { blockedId: userId },
      });

      if (error) throw error;

      if (data?.success) {
        setIsBlocked(false);
        await syncDatabase();
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      Alert.alert('Error', 'Failed to unblock user');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDuration = (start: Date, end?: Date): string => {
    if (!end) return '--';
    const diffMs = end.getTime() - start.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!profileUser) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>User not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#6366f1"
          colors={['#6366f1']}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backArrow} onPress={() => router.back()}>
          <Text style={styles.backArrowText}>{'<'}</Text>
        </TouchableOpacity>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profileUser.username?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>

        <Text style={styles.username}>@{profileUser.username}</Text>

        {profileUser.bio && (
          <Text style={styles.bio}>{profileUser.bio}</Text>
        )}

        {/* Follow Stats */}
        <View style={styles.followStats}>
          <TouchableOpacity
            style={styles.followStatItem}
            onPress={() => router.push(`/users/${userId}/followers`)}
          >
            <Text style={styles.followStatValue}>{followersCount}</Text>
            <Text style={styles.followStatLabel}>Followers</Text>
          </TouchableOpacity>

          <View style={styles.followStatDivider} />

          <TouchableOpacity
            style={styles.followStatItem}
            onPress={() => router.push(`/users/${userId}/following`)}
          >
            <Text style={styles.followStatValue}>{followingCount}</Text>
            <Text style={styles.followStatLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        {!isOwnProfile && (
          <View style={styles.actionButtons}>
            {isBlocked ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.unblockButton]}
                onPress={handleUnblock}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.actionButtonText}>Unblock</Text>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    isFollowing ? styles.followingButton : styles.followButton,
                  ]}
                  onPress={isFollowing ? handleUnfollow : handleFollow}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.actionButtonText}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.blockButton]}
                  onPress={handleBlock}
                  disabled={actionLoading}
                >
                  <Text style={styles.blockButtonText}>Block</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{userLevel?.level || 1}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {userLevel?.totalXp?.toLocaleString() || '0'}
          </Text>
          <Text style={styles.statLabel}>Total XP</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{badges.length}</Text>
          <Text style={styles.statLabel}>Badges</Text>
        </View>
      </View>

      {/* Badges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        {badges.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>No badges earned yet</Text>
          </View>
        ) : (
          <View>
            {badges.map((badge) => (
              <BadgeCard
                key={badge.id}
                title={badge.achievement?.title || 'Achievement'}
                description={badge.achievement?.description || ''}
                earnedAt={badge.earnedAt}
                isRusty={badge.isRusty}
              />
            ))}
          </View>
        )}
      </View>

      {/* Recent Workouts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Workouts</Text>
        {recentWorkouts.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>No public workouts</Text>
          </View>
        ) : (
          <View>
            {recentWorkouts.map((workout) => (
              <View key={workout.id} style={styles.workoutCard}>
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutName}>{workout.name}</Text>
                  <Text style={styles.workoutDate}>
                    {formatDate(workout.startedAt)}
                  </Text>
                </View>
                <Text style={styles.workoutDuration}>
                  {formatDuration(workout.startedAt, workout.endedAt)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Footer spacer */}
      <View style={styles.footer} />
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#94a3b8',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backArrow: {
    position: 'absolute',
    top: 60,
    left: 16,
    padding: 8,
  },
  backArrowText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  bio: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: '80%',
    marginBottom: 16,
  },
  followStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  followStatItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  followStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  followStatLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  followStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#334155',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  followButton: {
    backgroundColor: '#6366f1',
  },
  followingButton: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  blockButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  unblockButton: {
    backgroundColor: '#7f1d1d',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  blockButtonText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  emptySection: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
  },
  workoutCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  workoutDate: {
    fontSize: 13,
    color: '#94a3b8',
  },
  workoutDuration: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  footer: {
    height: 40,
  },
});
