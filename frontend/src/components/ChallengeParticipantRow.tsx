/**
 * ChallengeParticipantRow Component
 * Phase 2G: Social & Competition - Challenge System
 * 
 * Individual participant row in challenge rankings
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import type ChallengeParticipant from '../db/models/ChallengeParticipant';
import type User from '../db/models/User';

interface ChallengeParticipantRowProps {
  participant: ChallengeParticipant;
  user?: User;
  isCurrentUser: boolean;
  rank: number;
}

export default function ChallengeParticipantRow({
  participant,
  user,
  isCurrentUser,
  rank,
}: ChallengeParticipantRowProps) {
  const colors = useTheme();
  const medal = participant.medalType;

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
      accessibilityLabel={`Rank ${rank}, ${user?.username || 'User'}, score ${participant.formattedScore}`}
    >
      <View style={styles.rankContainer}>
        {medal ? (
          <Ionicons
            name={medal === 'gold' ? 'trophy' : medal === 'silver' ? 'trophy-outline' : 'medal-outline'}
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
          {participant.formattedScore}
        </Text>
        <Text style={[styles.status, { color: participant.statusColor }]}>
          {participant.statusLabel}
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
    marginBottom: 2,
  },
  status: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
