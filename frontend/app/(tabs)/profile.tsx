import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { database } from '../../src/db';
import { Q } from '@nozbe/watermelondb';
import LevelProgress from '../../src/components/LevelProgress';
import BadgeCard from '../../src/components/BadgeCard';
import type UserLevel from '../../src/db/models/UserLevel';
import type UserBadge from '../../src/db/models/UserBadge';
import type Achievement from '../../src/db/models/Achievement';
import { useTheme } from '../../src/hooks/useTheme';

interface BadgeWithAchievement {
  id: string;
  achievementCode: string;
  earnedAt: Date;
  isRusty: boolean;
  achievement?: Achievement;
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const colors = useTheme();
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [badges, setBadges] = useState<BadgeWithAchievement[]>([]);
  const [prCount, setPrCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    loadUserStats();

    // Subscribe to changes
    const levelSubscription = database.collections
      .get('user_levels')
      .query(Q.where('user_id', user.id))
      .observe()
      .subscribe((levels) => {
        setUserLevel(levels[0] as UserLevel || null);
      });

    const badgeSubscription = database.collections
      .get('user_badges')
      .query(
        Q.where('user_id', user.id),
        Q.where('deleted_at', null),
        Q.sortBy('earned_at', Q.desc)
      )
      .observe()
      .subscribe(async (userBadges) => {
        // FIX: Batch load all achievements once, then use Map for O(1) lookup
        // This eliminates N+1 query pattern (20 badges = 1 query instead of 20)
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
        setLoading(false);
      });

    return () => {
      levelSubscription.unsubscribe();
      badgeSubscription.unsubscribe();
    };
  }, [user]);

  const loadUserStats = async (): Promise<void> => {
    if (!user) return;

    try {
      // Get PR count
      const prSets = await database.collections
        .get('workout_sets')
        .query(
          Q.where('user_id', user.id),
          Q.where('is_pr', true),
          Q.where('deleted_at', null)
        )
        .fetchCount();

      setPrCount(prSets);
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.background }]}>
            {user?.user_metadata?.username?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={[styles.username, { color: colors.textPrimary }]}>
          @{user?.user_metadata?.username || 'User'}
        </Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
      </View>

      {userLevel && (
        <View style={styles.levelSection}>
          <LevelProgress
            level={userLevel.level}
            totalXp={userLevel.totalXp}
            xpToNextLevel={userLevel.xpToNextLevel}
          />
        </View>
      )}

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{userLevel?.level || 1}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Level</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{userLevel?.totalXp.toLocaleString() || '0'}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total XP</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{prCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>PRs</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Achievements</Text>
        {loading ? (
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading badges...</Text>
        ) : badges.length === 0 ? (
          <View style={[styles.emptyBadges, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No badges earned yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Complete workouts to unlock achievements
            </Text>
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

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Settings</Text>

        <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.surface }]}>
          <Text style={[styles.settingText, { color: colors.textPrimary }]}>Edit Profile</Text>
          <Text style={[styles.settingArrow, { color: colors.textMuted }]}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.surface }]}>
          <Text style={[styles.settingText, { color: colors.textPrimary }]}>Units & Preferences</Text>
          <Text style={[styles.settingArrow, { color: colors.textMuted }]}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.surface }]}>
          <Text style={[styles.settingText, { color: colors.textPrimary }]}>Notifications</Text>
          <Text style={[styles.settingArrow, { color: colors.textMuted }]}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.surface }]}>
          <Text style={[styles.settingText, { color: colors.textPrimary }]}>Privacy</Text>
          <Text style={[styles.settingArrow, { color: colors.textMuted }]}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.error }]} onPress={handleLogout}>
          <Text style={[styles.logoutText, { color: colors.textPrimary }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>Spotter v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 16,
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
  },
  email: {
    fontSize: 16,
    marginTop: 4,
  },
  levelSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    padding: 24,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    padding: 24,
  },
  emptyBadges: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  settingItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
  },
  settingArrow: {
    fontSize: 18,
  },
  logoutButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
});
