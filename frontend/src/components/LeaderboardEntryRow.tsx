/**
 * LeaderboardEntryRow Component
 * Phase 2G: Social & Competition - Leaderboards
 * 
 * Individual rank row in leaderboard
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import type LeaderboardEntry from '../db/models/LeaderboardEntry';
import type User from '../db/models/User';
import type Leaderboard from '../db/models/Leaderboard';

interface LeaderboardEntryRowProps {
  entry: LeaderboardEntry;
  user?: User;
  leaderboard: Leaderboard;
  rank: number;
  isCurrentUser: boolean;
}

export default function LeaderboardEntryRow({
  entry,
  user,
  leaderboard,
  rank,
  isCurrentUser,
}: LeaderboardEntryRowProps) {
  const colors = useTheme();
  const medal = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : null;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: isCurrentUser ? colors.primary + '10' : colors.surface,
          borderColor: isCurrentUser ? colors.primary : colors.border,
        },
      ]}
      accessible={true}
      accessibilityLabel={`Rank ${rank}, ${user?.username || 'User'}, score ${entry.score}${leaderboard.scoreSuffix}`}
    >
      <View style={styles.rankContainer}>
        {medal ? (
          <Ionicons
            name={medal === 'gold' ? 'trophy' : 'medal-outline'}
            size={24}
            color={medal === 'gold' ? '#fbbf24' : medal === 'silver' ? '#94a3b8' : '#cd7f32'}
          />
        ) : (
          <Text style={[styles.rank, { color: colors.textSecondary }]}>#{rank}</Text>
        )}
      </View>

      <View style={styles.userInfo}>
        <Text style={[styles.username, { color: colors.textPrimary }]}>
          {user?.username || 'Unknown User'}
          {isCurrentUser && (
            <Text style={[styles.youLabel, { color: colors.primary }]}> (You)</Text>
          )}
        </Text>
        {/* Level display removed - User model doesn't have level property, would need to fetch from UserLevel separately */}
      </View>

      <View style={styles.scoreContainer}>
        <Text style={[styles.score, { color: colors.textPrimary }]}>
          {entry.score.toLocaleString()}{leaderboard.scoreSuffix}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rank: {
    fontSize: 16,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  youLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  level: {
    fontSize: 12,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 16,
    fontWeight: '700',
  },
});
