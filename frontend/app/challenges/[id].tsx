/**
 * Challenge Detail Screen
 * Phase 2G: Social & Competition - Challenge System
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
import { useChallengeStore } from '../../src/stores/challengeStore';
import { useAuthStore } from '../../src/stores/authStore';
import ChallengeParticipantRow from '../../src/components/ChallengeParticipantRow';
import { syncDatabase } from '../../src/db/sync';
import { Q } from '@nozbe/watermelondb';
import { usersCollection } from '../../src/db';
import type User from '../../src/db/models/User';
import EmptyState from '../../src/components/EmptyState';

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTheme();
  const { user } = useAuthStore();
  const {
    currentChallenge,
    currentChallengeParticipants,
    userParticipant,
    loadChallengeDetails,
    joinChallenge,
    leaveChallenge,
    loading,
  } = useChallengeStore();

  const [refreshing, setRefreshing] = useState(false);
  const [participantUsers, setParticipantUsers] = useState<Map<string, User>>(new Map());

  useEffect(() => {
    if (id) {
      loadChallengeDetails(id);
    }
  }, [id]);

  useEffect(() => {
    if (currentChallengeParticipants.length > 0) {
      loadParticipantUsers();
    }
  }, [currentChallengeParticipants]);

  const loadParticipantUsers = async () => {
    const userIds = Array.from(
      new Set(currentChallengeParticipants.map((p) => p.userId))
    );

    if (userIds.length === 0) return;

    const users = await usersCollection
      .query(Q.where('server_id', Q.oneOf(userIds)))
      .fetch();

    const userMap = new Map<string, User>();
    users.forEach((u) => {
      const typedUser = u as User;
      if (typedUser.serverId) {
        userMap.set(typedUser.serverId, typedUser);
      }
    });

    setParticipantUsers(userMap);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await syncDatabase();
      if (id) {
        await loadChallengeDetails(id);
      }
    } catch (error) {
      console.error('Error refreshing challenge:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleJoin = async () => {
    if (!currentChallenge?.serverId) return;
    try {
      await joinChallenge(currentChallenge.serverId);
      if (id) {
        await loadChallengeDetails(id);
      }
    } catch (error) {
      console.error('Error joining challenge:', error);
    }
  };

  const handleLeave = async () => {
    if (!currentChallenge?.serverId) return;
    try {
      await leaveChallenge(currentChallenge.serverId);
      if (id) {
        await loadChallengeDetails(id);
      }
    } catch (error) {
      console.error('Error leaving challenge:', error);
    }
  };

  if (loading && !currentChallenge) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!currentChallenge) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="🏆"
          title="Challenge not found"
          message="This challenge may have been deleted or you don't have access to it"
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const isParticipating = !!userParticipant && !userParticipant.deletedAt;
  const canJoin = currentChallenge.isJoinable && !isParticipating;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Challenge</Text>
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
        {/* Challenge Header */}
        <View style={[styles.challengeHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.challengeHeaderTop}>
            <Ionicons
              name={currentChallenge.challengeTypeIcon as any}
              size={32}
              color={colors.primary}
            />
            <View style={styles.challengeTitleContainer}>
              <Text style={[styles.challengeTitle, { color: colors.textPrimary }]}>
                {currentChallenge.title}
              </Text>
              <Text style={[styles.challengeType, { color: colors.textSecondary }]}>
                {currentChallenge.challengeTypeLabel}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: currentChallenge.statusColor + '20',
                  borderColor: currentChallenge.statusColor,
                },
              ]}
            >
              <Text style={[styles.statusText, { color: currentChallenge.statusColor }]}>
                {currentChallenge.statusLabel}
              </Text>
            </View>
          </View>

          {currentChallenge.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {currentChallenge.description}
            </Text>
          )}

          <View style={styles.challengeMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {new Date(currentChallenge.startDate).toLocaleDateString()} -{' '}
                {new Date(currentChallenge.endDate).toLocaleDateString()}
              </Text>
            </View>
            {currentChallenge.daysRemaining > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {currentChallenge.daysRemaining} {currentChallenge.daysRemaining === 1 ? 'day' : 'days'} left
                </Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {currentChallengeParticipants.length} / {currentChallenge.maxParticipants} participants
              </Text>
            </View>
          </View>
        </View>

        {/* User's Participation Status */}
        {isParticipating && userParticipant && (
          <View style={[styles.userStatusCard, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
            <Text style={[styles.userStatusTitle, { color: colors.primary }]}>Your Progress</Text>
            <View style={styles.userStatusRow}>
              <View>
                <Text style={[styles.userStatusLabel, { color: colors.textSecondary }]}>Rank</Text>
                <Text style={[styles.userStatusValue, { color: colors.textPrimary }]}>
                  #{userParticipant.rank || '-'}
                </Text>
              </View>
              <View>
                <Text style={[styles.userStatusLabel, { color: colors.textSecondary }]}>Score</Text>
                <Text style={[styles.userStatusValue, { color: colors.textPrimary }]}>
                  {userParticipant.formattedScore}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Participants */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Leaderboard</Text>
          {currentChallengeParticipants.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No participants yet</Text>
          ) : (
            currentChallengeParticipants.map((participant, index) => {
              const participantUser = participantUsers.get(participant.userId);
              return (
                <ChallengeParticipantRow
                  key={participant.id}
                  participant={participant}
                  user={participantUser}
                  isCurrentUser={participant.userId === user?.id}
                  rank={index + 1}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {canJoin && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleJoin}
            disabled={loading}
          >
            <Text style={[styles.actionButtonText, { color: colors.background }]}>Join Challenge</Text>
          </TouchableOpacity>
        )}
        {isParticipating && (
          <TouchableOpacity
            style={[styles.actionButton, styles.leaveButton, { borderColor: colors.border }]}
            onPress={handleLeave}
            disabled={loading}
          >
            <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>Leave Challenge</Text>
          </TouchableOpacity>
        )}
      </View>
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
  challengeHeader: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  challengeHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  challengeTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  challengeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  challengeType: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  challengeMeta: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 13,
  },
  userStatusCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  userStatusTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  userStatusRow: {
    flexDirection: 'row',
    gap: 32,
  },
  userStatusLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  userStatusValue: {
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
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  leaveButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
