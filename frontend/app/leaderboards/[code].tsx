/**
 * Leaderboard Detail Screen
 * Phase 2G: Social & Competition - Leaderboards
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { getLeaderboard } from '../../src/services/leaderboards';
import LeaderboardEntryRow from '../../src/components/LeaderboardEntryRow';
import EmptyState from '../../src/components/EmptyState';
import { syncDatabase } from '../../src/db/sync';
import { Q } from '@nozbe/watermelondb';
import { leaderboardsCollection, usersCollection } from '../../src/db';
import type Leaderboard from '../../src/db/models/Leaderboard';
import type User from '../../src/db/models/User';
import { useAuthStore } from '../../src/stores/authStore';
import type { LeaderboardCode } from '../../src/db/models/Leaderboard';

export default function LeaderboardDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const colors = useTheme();
  const { user } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [entries, setEntries] = useState<Array<{ entry: any; user?: User }>>([]);
  const [userEntry, setUserEntry] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (code) {
      loadLeaderboard();
    }
  }, [code]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // Get leaderboard definition from local DB
      const leaderboards = await leaderboardsCollection
        .query(Q.where('code', code), Q.where('is_active', true))
        .fetch();

      if (leaderboards.length === 0) {
        setLoading(false);
        return;
      }

      const lb = leaderboards[0] as Leaderboard;
      setLeaderboard(lb);

      // Get entries from server
      const response = await getLeaderboard(code as LeaderboardCode, 100);

      // Get user info for all entries
      const userIds = Array.from(new Set(response.entries.map((e) => e.user_id)));
      const users = userIds.length > 0
        ? await usersCollection.query(Q.where('server_id', Q.oneOf(userIds))).fetch()
        : [];

      const userMap = new Map<string, User>();
      users.forEach((u) => {
        const typedUser = u as User;
        if (typedUser.serverId) {
          userMap.set(typedUser.serverId, typedUser);
        }
      });

      // Map entries
      const mappedEntries = response.entries.map((e) => ({
        entry: {
          id: e.user_id,
          serverId: e.user_id,
          leaderboardId: lb.id,
          userId: e.user_id,
          rank: e.rank,
          score: e.score,
          periodStart: new Date(response.period.start),
          periodEnd: new Date(response.period.end),
          computedAt: new Date(response.computed_at),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: userMap.get(e.user_id),
      }));

      setEntries(mappedEntries);

      // Set user entry
      if (response.user_entry) {
        setUserEntry({
          id: response.user_entry.user_id,
          serverId: response.user_entry.user_id,
          leaderboardId: lb.id,
          userId: response.user_entry.user_id,
          rank: response.user_entry.rank,
          score: response.user_entry.score,
          periodStart: new Date(response.period.start),
          periodEnd: new Date(response.period.end),
          computedAt: new Date(response.computed_at),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await syncDatabase();
      await loadLeaderboard();
    } catch (error) {
      console.error('Error refreshing leaderboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && !leaderboard) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!leaderboard) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="🏆"
          title="Leaderboard not found"
          message="This leaderboard may not exist or is inactive"
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{leaderboard.title}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {leaderboard.description || `Top ${leaderboard.metricTypeLabel} rankings`}
          </Text>
          <Text style={[styles.period, { color: colors.textSecondary }]}>
            Period: {new Date(userEntry?.periodStart || Date.now()).toLocaleDateString()} -{' '}
            {new Date(userEntry?.periodEnd || Date.now()).toLocaleDateString()}
          </Text>
          {userEntry?.computedAt && (
            <Text style={[styles.computedAt, { color: colors.textMuted }]}>
              Last updated: {new Date(userEntry.computedAt).toLocaleString()}
            </Text>
          )}
        </View>

        {/* User's rank highlight */}
        {userEntry && (
          <View style={[styles.userRankCard, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
            <Text style={[styles.userRankTitle, { color: colors.primary }]}>Your Rank</Text>
            <View style={styles.userRankRow}>
              <Text style={[styles.userRankValue, { color: colors.textPrimary }]}>#{userEntry.rank}</Text>
              <Text style={[styles.userScoreValue, { color: colors.textPrimary }]}>
                {userEntry.score.toLocaleString()}{leaderboard.scoreSuffix}
              </Text>
            </View>
          </View>
        )}

        {/* Rankings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Rankings</Text>
          {entries.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No entries yet</Text>
          ) : (
            entries.map((item) => (
              <LeaderboardEntryRow
                key={item.entry.id}
                entry={item.entry}
                user={item.user}
                leaderboard={leaderboard}
                rank={item.entry.rank}
                isCurrentUser={item.entry.userId === user?.id}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  period: {
    fontSize: 12,
    marginBottom: 4,
  },
  computedAt: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  userRankCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  userRankTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  userRankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userRankValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  userScoreValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
