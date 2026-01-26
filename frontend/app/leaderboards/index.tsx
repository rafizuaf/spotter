/**
 * Leaderboards List Screen
 * Phase 2G: Social & Competition - Leaderboards
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { getAllLeaderboards, getLeaderboard } from '../../src/services/leaderboards';
import LeaderboardCard from '../../src/components/LeaderboardCard';
import EmptyState from '../../src/components/EmptyState';
import { syncDatabase } from '../../src/db/sync';
import { Q } from '@nozbe/watermelondb';
import { usersCollection } from '../../src/db';
import type Leaderboard from '../../src/db/models/Leaderboard';
import type LeaderboardEntry from '../../src/db/models/LeaderboardEntry';
import type User from '../../src/db/models/User';

type PeriodTab = 'weekly' | 'monthly' | 'allTime';

export default function LeaderboardsScreen() {
  const router = useRouter();
  const colors = useTheme();
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([]);
  const [periodTab, setPeriodTab] = useState<PeriodTab>('weekly');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<Map<string, {
    topEntries: Array<{ entry: LeaderboardEntry; user?: User }>;
    userEntry: LeaderboardEntry | null;
  }>>(new Map());

  useEffect(() => {
    loadLeaderboards();
  }, [periodTab]);

  const loadLeaderboards = async () => {
    setLoading(true);
    try {
      // Get leaderboards from local DB
      const allLeaderboards = await getAllLeaderboards();
      
      // Filter by period
      const filtered = allLeaderboards.filter((lb) => {
        if (periodTab === 'weekly') return lb.timePeriod === 'WEEKLY';
        if (periodTab === 'monthly') return lb.timePeriod === 'MONTHLY';
        return lb.timePeriod === 'ALL_TIME';
      });

      setLeaderboards(filtered);

      // Load entries for each leaderboard
      const dataMap = new Map<string, {
        topEntries: Array<{ entry: LeaderboardEntry; user?: User }>;
        userEntry: LeaderboardEntry | null;
      }>();

      for (const lb of filtered) {
        try {
          // Get from server (most up-to-date)
          const response = await getLeaderboard(lb.code as any, 10);
          
          // Get user info for top entries
          const userIds = response.entries.map((e) => e.user_id);
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
          const topEntries = response.entries.slice(0, 3).map((e) => ({
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
            } as LeaderboardEntry,
            user: userMap.get(e.user_id),
          }));

          const userEntry = response.user_entry
            ? {
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
              } as LeaderboardEntry
            : null;

          dataMap.set(lb.id, { topEntries, userEntry });
        } catch (error) {
          console.error(`Error loading leaderboard ${lb.code}:`, error);
        }
      }

      setLeaderboardData(dataMap);
    } catch (error) {
      console.error('Error loading leaderboards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await syncDatabase();
      await loadLeaderboards();
    } catch (error) {
      console.error('Error refreshing leaderboards:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderLeaderboard = ({ item }: { item: Leaderboard }) => {
    const data = leaderboardData.get(item.id);
    const userEntry = data?.userEntry;
    // Note: user prop is not used in LeaderboardCard for display, only for current user check
    // We pass undefined since we don't have WatermelonDB User model here
    return (
      <LeaderboardCard
        leaderboard={item}
        topEntries={data?.topEntries || []}
        userEntry={userEntry || null}
        user={undefined}
        onPress={() => router.push(`/leaderboards/${item.code}` as never)}
      />
    );
  };

  const getLeaderboardsForPeriod = (): Leaderboard[] => {
    return leaderboards.filter((lb) => {
      if (periodTab === 'weekly') return lb.timePeriod === 'WEEKLY';
      if (periodTab === 'monthly') return lb.timePeriod === 'MONTHLY';
      return lb.timePeriod === 'ALL_TIME';
    });
  };

  const filteredLeaderboards = getLeaderboardsForPeriod();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Leaderboards</Text>
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['weekly', 'monthly', 'allTime'] as PeriodTab[]).map((period) => {
          const labels: Record<PeriodTab, string> = {
            weekly: 'Weekly',
            monthly: 'Monthly',
            allTime: 'All Time',
          };
          return (
            <TouchableOpacity
              key={period}
              style={[
                styles.tab,
                periodTab === period && { borderBottomColor: colors.primary },
              ]}
              onPress={() => setPeriodTab(period)}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: periodTab === period ? colors.primary : colors.textSecondary,
                    fontWeight: periodTab === period ? '600' : '400',
                  },
                ]}
              >
                {labels[period]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && filteredLeaderboards.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredLeaderboards}
          renderItem={renderLeaderboard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            filteredLeaderboards.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="🏆"
              title="No leaderboards"
              message="Leaderboards are computed daily. Check back tomorrow!"
            />
          }
        />
      )}
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
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
});
