/**
 * ChallengeCard Component
 * Phase 2G: Social & Competition - Challenge System
 * 
 * Challenge list item card
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import type Challenge from '../db/models/Challenge';
import type ChallengeParticipant from '../db/models/ChallengeParticipant';

interface ChallengeCardProps {
  challenge: Challenge;
  userParticipant?: ChallengeParticipant;
  onPress: () => void;
  onJoin?: () => void;
  onLeave?: () => void;
}

export default function ChallengeCard({
  challenge,
  userParticipant,
  onPress,
  onJoin,
  onLeave,
}: ChallengeCardProps) {
  const colors = useTheme();
  const isParticipating = !!userParticipant && !userParticipant.deletedAt;
  const canJoin = challenge.isJoinable && !isParticipating;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      accessible={true}
      accessibilityLabel={`${challenge.title}, ${challenge.challengeTypeLabel}, ${challenge.statusLabel}`}
      accessibilityRole="button"
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name={challenge.challengeTypeIcon as keyof typeof Ionicons.glyphMap}
            size={24}
            color={colors.primary}
            style={styles.icon}
          />
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {challenge.title}
            </Text>
            <Text style={[styles.type, { color: colors.textSecondary }]}>
              {challenge.challengeTypeLabel}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: challenge.statusColor + '20', borderColor: challenge.statusColor },
          ]}
        >
          <Text style={[styles.statusText, { color: challenge.statusColor }]}>
            {challenge.statusLabel}
          </Text>
        </View>
      </View>

      {challenge.description && (
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {challenge.description}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.meta}>
          <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {challenge.maxParticipants} max
          </Text>
          {challenge.daysRemaining > 0 && (
            <>
              <Text style={[styles.metaSeparator, { color: colors.textMuted }]}>•</Text>
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {challenge.daysRemaining} {challenge.daysRemaining === 1 ? 'day' : 'days'} left
              </Text>
            </>
          )}
        </View>

        {isParticipating && userParticipant && (
          <View style={styles.participantInfo}>
            <Text style={[styles.rankText, { color: colors.primary }]}>
              #{userParticipant.rank || '-'}
            </Text>
            <Text style={[styles.scoreText, { color: colors.textSecondary }]}>
              {userParticipant.formattedScore}
            </Text>
          </View>
        )}

        {canJoin && onJoin && (
          <TouchableOpacity
            style={[styles.joinButton, { backgroundColor: colors.primary }]}
            onPress={(e) => {
              e.stopPropagation();
              onJoin();
            }}
            accessible={true}
            accessibilityLabel="Join challenge"
            accessibilityRole="button"
          >
            <Text style={[styles.joinButtonText, { color: colors.background }]}>Join</Text>
          </TouchableOpacity>
        )}

        {isParticipating && onLeave && (
          <TouchableOpacity
            style={[styles.leaveButton, { borderColor: colors.border }]}
            onPress={(e) => {
              e.stopPropagation();
              onLeave();
            }}
            accessible={true}
            accessibilityLabel="Leave challenge"
            accessibilityRole="button"
          >
            <Text style={[styles.leaveButtonText, { color: colors.textSecondary }]}>Leave</Text>
          </TouchableOpacity>
        )}
      </View>
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
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
  type: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  metaSeparator: {
    marginHorizontal: 8,
    fontSize: 12,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  joinButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  leaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  leaveButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
