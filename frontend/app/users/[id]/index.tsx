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
import { useTheme } from '../../../src/hooks/useTheme';

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
  const colors = useTheme();

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

      // FIX: Batch load all achievements once, then use Map for O(1) lookup
      // This eliminates N+1 query pattern (6 badges = 1 query instead of 6)
      const allAchievements = await database.collections
        .get('achievements')
        .query()
        .fetch();
      
      const achievementMap = new Map<string, Achievement>();
      allAchievements.forEach((achievement) => {
        const typedAchievement = achievement as Achievement;
        achievementMap.set(typedAchievement.code, typedAchievement);
      });

      // Map badges to achievements using the pre-loaded Map
      const badgesWithAchievements = userBadges.map((badge) => {
        const typedBadge = badge as UserBadge;
        const achievement = achievementMap.get(typedBadge.achievementCode);

        return {
          id: typedBadge.id,
          achievementCode: typedBadge.achievementCode,
          earnedAt: typedBadge.earnedAt,
          isRusty: typedBadge.isRusty,
          achievement,
        };
      });
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profileUser) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>User not found</Text>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={[styles.backButtonText, { color: colors.background }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backArrow} onPress={() => router.back()}>
          <Text style={[styles.backArrowText, { color: colors.textPrimary }]}>{'<'}</Text>
        </TouchableOpacity>

        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.background }]}>
            {profileUser.username?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>

        <Text style={[styles.username, { color: colors.textPrimary }]}>@{profileUser.username}</Text>

        {profileUser.bio && (
          <Text style={[styles.bio, { color: colors.textSecondary }]}>{profileUser.bio}</Text>
        )}

        {/* Follow Stats */}
        <View style={styles.followStats}>
          <TouchableOpacity
            style={styles.followStatItem}
            onPress={() => router.push(`/users/${userId}/followers`)}
          >
            <Text style={[styles.followStatValue, { color: colors.textPrimary }]}>{followersCount}</Text>
            <Text style={[styles.followStatLabel, { color: colors.textSecondary }]}>Followers</Text>
          </TouchableOpacity>

          <View style={[styles.followStatDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.followStatItem}
            onPress={() => router.push(`/users/${userId}/following`)}
          >
            <Text style={[styles.followStatValue, { color: colors.textPrimary }]}>{followingCount}</Text>
            <Text style={[styles.followStatLabel, { color: colors.textSecondary }]}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        {!isOwnProfile && (
          <View style={styles.actionButtons}>
            {isBlocked ? (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.error }]}
                onPress={handleUnblock}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={[styles.actionButtonText, { color: colors.white }]}>Unblock</Text>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    isFollowing 
                      ? { backgroundColor: colors.surfaceElevated, borderColor: colors.primary, borderWidth: 1 }
                      : { backgroundColor: colors.primary },
                  ]}
                  onPress={isFollowing ? handleUnfollow : handleFollow}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={[styles.actionButtonText, { color: colors.white }]}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.transparent, borderColor: colors.error, borderWidth: 1 }]}
                  onPress={handleBlock}
                  disabled={actionLoading}
                >
                  <Text style={[styles.blockButtonText, { color: colors.error }]}>Block</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{userLevel?.level || 1}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Level</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {userLevel?.totalXp?.toLocaleString() || '0'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total XP</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{badges.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Badges</Text>
        </View>
      </View>

      {/* Badges */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Achievements</Text>
        {badges.length === 0 ? (
          <View style={[styles.emptySection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No badges earned yet</Text>
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
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Workouts</Text>
        {recentWorkouts.length === 0 ? (
          <View style={[styles.emptySection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No public workouts</Text>
          </View>
        ) : (
          <View>
            {recentWorkouts.map((workout) => (
              <View key={workout.id} style={[styles.workoutCard, { backgroundColor: colors.surface }]}>
                <View style={styles.workoutInfo}>
                  <Text style={[styles.workoutName, { color: colors.textPrimary }]}>{workout.name}</Text>
                  <Text style={[styles.workoutDate, { color: colors.textSecondary }]}>
                    {formatDate(workout.startedAt)}
                  </Text>
                </View>
                <Text style={[styles.workoutDuration, { color: colors.textMuted }]}>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  backArrow: {
    position: 'absolute',
    top: 60,
    left: 16,
    padding: 8,
  },
  backArrowText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bio: {
    fontSize: 15,
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
  },
  followStatLabel: {
    fontSize: 14,
    marginTop: 2,
  },
  followStatDivider: {
    width: 1,
    height: 30,
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
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  blockButtonText: {
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
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptySection: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
  workoutCard: {
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
    marginBottom: 4,
  },
  workoutDate: {
    fontSize: 13,
  },
  workoutDuration: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    height: 40,
  },
});
