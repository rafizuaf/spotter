import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { database, userSettingsCollection } from '../../src/db';
import { Q } from '@nozbe/watermelondb';
import LevelProgress from '../../src/components/LevelProgress';
import BadgeCard from '../../src/components/BadgeCard';
import RankingBadge from '../../src/components/RankingBadge';
import ProfileRankings from '../../src/components/ProfileRankings';
import StrengthStandardsCard from '../../src/components/StrengthStandardsCard';
import { getUserRankings, isRankingBadge } from '../../src/services/rankings';
import type { UserRanking } from '../../src/services/rankings';
import { ViralShareModal } from '../../src/components/viral';
import type { ViralShareType } from '../../src/components/viral';
import type UserLevel from '../../src/db/models/UserLevel';
import type UserBadge from '../../src/db/models/UserBadge';
import type Achievement from '../../src/db/models/Achievement';
import type UserSettings from '../../src/db/models/UserSettings';
import type UserBodyLog from '../../src/db/models/UserBodyLog';
import type WorkoutSet from '../../src/db/models/WorkoutSet';
import type Exercise from '../../src/db/models/Exercise';
import { useTheme } from '../../src/hooks/useTheme';
import {
  calculateStrengthRating,
  processBestLifts,
  type StrengthRating,
  type UserLiftData,
} from '../../src/utils/strengthCalculations';
import { getSupportedExercises } from '../../src/constants/strengthStandards';

interface BadgeWithAchievement {
  id: string;
  achievementCode: string;
  earnedAt: Date;
  isRusty: boolean;
  achievement?: Achievement;
}

interface StrengthStandardData {
  exerciseName: string;
  userOneRepMax: number;
  rating: StrengthRating;
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const colors = useTheme();
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [badges, setBadges] = useState<BadgeWithAchievement[]>([]);
  const [prCount, setPrCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Strength standards state
  const [strengthStandards, setStrengthStandards] = useState<StrengthStandardData[]>([]);
  const [userBodyweight, setUserBodyweight] = useState<number | null>(null);
  const [userGender, setUserGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [weightUnit, setWeightUnit] = useState<'KG' | 'LBS'>('KG');
  const [strengthLoading, setStrengthLoading] = useState(true);

  // Viral sharing state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareType, setShareType] = useState<ViralShareType>('ARCHETYPE');

  // Profile rankings state (ranking badges & leaderboard display)
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [showProfileRankings, setShowProfileRankings] = useState(true);
  const [prominentRankLeaderboardCode, setProminentRankLeaderboardCode] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    loadUserStats();
    loadStrengthStandards();

    getUserRankings(user.id).then(setRankings).catch(() => {});

    const settingsSubscription = userSettingsCollection
      .query(Q.where('user_id', user.id))
      .observe()
      .subscribe((settings) => {
        const s = (settings as UserSettings[])[0];
        if (s) {
          setShowProfileRankings(s.showProfileRankings ?? true);
          setProminentRankLeaderboardCode(s.prominentRankLeaderboardCode ?? null);
        }
      });

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
      settingsSubscription.unsubscribe();
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

  const loadStrengthStandards = async (): Promise<void> => {
    if (!user) return;

    try {
      setStrengthLoading(true);

      // Load user settings for gender and weight unit
      const userSettings = await database.collections
        .get('user_settings')
        .query(Q.where('user_id', user.id))
        .fetch();

      if (userSettings.length > 0) {
        const settings = userSettings[0] as UserSettings;
        const gender = settings.gender as 'MALE' | 'FEMALE' | 'OTHER' | null;
        const unit = settings.weightUnitPreference as 'KG' | 'LBS' | null;
        setUserGender(gender || 'MALE');
        setWeightUnit(unit || 'KG');
      }

      // Load latest bodyweight from body logs (within last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const bodyLogs = await database.collections
        .get('user_body_logs')
        .query(
          Q.where('user_id', user.id),
          Q.where('deleted_at', null),
          Q.sortBy('logged_at', Q.desc),
          Q.take(1)
        )
        .fetch();

      if (bodyLogs.length > 0) {
        const latestLog = bodyLogs[0] as UserBodyLog;
        if (latestLog.weightKg !== undefined) {
          setUserBodyweight(latestLog.weightKg);
        }
      }

      // Load all exercises to map IDs to names
      const exercises = await database.collections
        .get('exercises')
        .query(Q.where('deleted_at', null))
        .fetch();

      const exerciseMap = new Map<string, string>();
      exercises.forEach((ex) => {
        const exercise = ex as Exercise;
        exerciseMap.set(exercise.serverId, exercise.name);
      });

      // Load user's workout sets for strength calculation
      const workoutSets = await database.collections
        .get('workout_sets')
        .query(
          Q.where('user_id', user.id),
          Q.where('deleted_at', null),
          Q.where('weight_kg', Q.gt(0)),
          Q.where('reps', Q.gt(0))
        )
        .fetch();

      // Process sets to find best lifts
      const setsWithNames = workoutSets
        .map((set) => {
          const typedSet = set as WorkoutSet;
          const exerciseName = exerciseMap.get(typedSet.exerciseId) || 'Unknown';
          return {
            exerciseName,
            weightKg: typedSet.weightKg ?? 0,
            reps: typedSet.reps ?? 0,
            createdAt: typedSet.createdAt,
          };
        })
        .filter((set) => set.weightKg > 0 && set.reps > 0);

      const bestLifts = processBestLifts(setsWithNames);

      // Get current bodyweight for calculations (use latest or default)
      const currentBodyweight = bodyLogs.length > 0
        ? ((bodyLogs[0] as UserBodyLog).weightKg ?? 75)
        : 75; // Default to 75kg if no bodyweight logged

      const rawGender = userSettings.length > 0
        ? (userSettings[0] as UserSettings).gender
        : null;
      const currentGender: 'MALE' | 'FEMALE' | 'OTHER' =
        (rawGender === 'MALE' || rawGender === 'FEMALE' || rawGender === 'OTHER')
          ? rawGender
          : 'MALE';

      // Calculate strength ratings for each supported exercise
      const standards: StrengthStandardData[] = [];
      const supportedExercises = getSupportedExercises();

      for (const exerciseName of supportedExercises) {
        const liftData = bestLifts.get(exerciseName);
        if (liftData) {
          const rating = calculateStrengthRating(
            exerciseName,
            liftData.best1RM,
            currentBodyweight,
            currentGender
          );

          if (rating.hasStandards) {
            standards.push({
              exerciseName,
              userOneRepMax: liftData.best1RM,
              rating,
            });
          }
        }
      }

      setStrengthStandards(standards);
    } catch (error) {
      console.error('Error loading strength standards:', error);
    } finally {
      setStrengthLoading(false);
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

      {/* Rankings (when enabled in settings) */}
      {showProfileRankings && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Rankings</Text>
          <ProfileRankings
            rankings={rankings}
            prominentLeaderboardCode={prominentRankLeaderboardCode}
          />
        </View>
      )}

      {/* Gym Archetype Button */}
      <TouchableOpacity
        style={[styles.archetypeButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
        onPress={() => {
          setShareType('ARCHETYPE');
          setShowShareModal(true);
        }}
        accessible={true}
        accessibilityLabel="View your gym archetype"
        accessibilityRole="button"
      >
        <Text style={[styles.archetypeButtonText, { color: colors.primary }]}>
          Discover Your Gym Archetype
        </Text>
        <Text style={[styles.archetypeButtonSubtext, { color: colors.textSecondary }]}>
          What kind of lifter are you?
        </Text>
      </TouchableOpacity>

      {/* Strength Standards Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Strength Standards</Text>
        {strengthLoading ? (
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading standards...</Text>
        ) : !userBodyweight ? (
          <View style={[styles.emptyBadges, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Add your bodyweight</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Log your bodyweight in Settings to see strength comparisons
            </Text>
          </View>
        ) : strengthStandards.length === 0 ? (
          <View style={[styles.emptyBadges, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No compound lifts logged yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Log Bench Press, Squat, or Deadlift to see your strength level
            </Text>
          </View>
        ) : (
          <View>
            {strengthStandards.map((standard) => (
              <StrengthStandardsCard
                key={standard.exerciseName}
                exerciseName={standard.exerciseName}
                userOneRepMax={standard.userOneRepMax}
                rating={standard.rating}
                weightUnit={weightUnit}
                userBodyweight={userBodyweight}
                gender={userGender}
              />
            ))}
            <Text style={[styles.standardsNote, { color: colors.textMuted }]}>
              Based on your bodyweight: {userBodyweight?.toFixed(1)}kg | Gender: {userGender.charAt(0) + userGender.slice(1).toLowerCase()}
            </Text>
          </View>
        )}
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
            {badges.map((badge) =>
              isRankingBadge(badge.achievementCode) ? (
                <RankingBadge
                  key={badge.id}
                  achievementCode={badge.achievementCode}
                  title={badge.achievement?.title || 'Achievement'}
                  description={badge.achievement?.description || ''}
                  earnedAt={badge.earnedAt}
                  isRusty={badge.isRusty}
                />
              ) : (
                <BadgeCard
                  key={badge.id}
                  title={badge.achievement?.title || 'Achievement'}
                  description={badge.achievement?.description || ''}
                  earnedAt={badge.earnedAt}
                  isRusty={badge.isRusty}
                />
              )
            )}
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

      {/* Viral Share Modal */}
      <ViralShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareType={shareType}
      />
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
  archetypeButton: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  archetypeButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  archetypeButtonSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  standardsNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
});
