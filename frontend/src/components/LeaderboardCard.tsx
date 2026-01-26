/**
 * LeaderboardCard Component
 * Phase 2G: Social & Competition - Leaderboards
 * 
 * Leaderboard list item card showing top 3 and user's rank
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import type Leaderboard from '../db/models/Leaderboard';
import type LeaderboardEntry from '../db/models/LeaderboardEntry';
import type User from '../db/models/User';

interface LeaderboardCardProps {
  leaderboard: Leaderboard;
  topEntries: Array<{ entry: LeaderboardEntry; user?: User }>;
  userEntry: LeaderboardEntry | null;
  user?: User;
  onPress: () => void;
}

export default function LeaderboardCard({
  leaderboard,
  topEntries,
  userEntry,
  user,
  onPress,
}: LeaderboardCardProps) {
  const colors = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      accessible={true}
      accessibilityLabel={`${leaderboard.title}, ${leaderboard.timePeriodLabel}`}
      accessibilityRole="button"
    >
      <View style={styles.header}>
        <Ionicons
          name={leaderboard.ionIconName as keyof typeof Ionicons.glyphMap}
          size={28}
          color={colors.primary}
          style={styles.icon}
        />
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {leaderboard.title}
          </Text>
          <Text style={[styles.period, { color: colors.textSecondary }]}>
            {leaderboard.timePeriodLabel}
          </Text>
        </View>
      </View>

      {leaderboard.description && (
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {leaderboard.description}
        </Text>
      )}

      {/* Top 3 */}
      {topEntries.length > 0 && (
        <View style={styles.topThree}>
          {topEntries.slice(0, 3).map((item, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : null;
            return (
              <View key={item.entry.id} style={styles.topEntry}>
                {medal && (
                  <Ionicons
                    name={medal === 'gold' ? 'trophy' : 'medal-outline'}
                    size={20}
                    color={medal === 'gold' ? '#fbbf24' : medal === 'silver' ? '#94a3b8' : '#cd7f32'}
                  />
                )}
                <Text style={[styles.topEntryUsername, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.user?.username || 'User'}
                </Text>
                <Text style={[styles.topEntryScore, { color: colors.textSecondary }]}>
                  {item.entry.score.toLocaleString()}{leaderboard.scoreSuffix}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* User's rank */}
      {userEntry && (
        <View style={[styles.userRank, { backgroundColor: colors.primary + '10' }]}>
          <Text style={[styles.userRankText, { color: colors.primary }]}>
            Your rank: #{userEntry.rank}
          </Text>
          <Text style={[styles.userScoreText, { color: colors.textSecondary }]}>
            {userEntry.score.toLocaleString()}{leaderboard.scoreSuffix}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.viewButton, { borderColor: colors.border }]}
        onPress={onPress}
      >
        <Text style={[styles.viewButtonText, { color: colors.primary }]}>View Full Leaderboard</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  period: {
    fontSize: 13,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  topThree: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  topEntry: {
    alignItems: 'center',
    flex: 1,
  },
  topEntryUsername: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 2,
  },
  topEntryScore: {
    fontSize: 11,
  },
  userRank: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  userRankText: {
    fontSize: 14,
    fontWeight: '600',
  },
  userScoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
});
