/**
 * Compete Tab Screen
 * Phase 2G: Social & Competition
 * 
 * Main screen for challenges and leaderboards with segmented control
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import SegmentedControl from '../../src/components/SegmentedControl';
import { useChallengeStore } from '../../src/stores/challengeStore';
import ChallengeCard from '../../src/components/ChallengeCard';
import EmptyState from '../../src/components/EmptyState';
import { syncDatabase } from '../../src/db/sync';
import { Q } from '@nozbe/watermelondb';
import { challengeParticipantsCollection } from '../../src/db';
import type ChallengeParticipant from '../../src/db/models/ChallengeParticipant';
import { useEffect } from 'react';
import { useAuthStore } from '../../src/stores/authStore';

export default function CompeteScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    activeChallenges,
    loadActiveChallenges,
    joinChallenge,
    leaveChallenge,
    loading,
  } = useChallengeStore();

  const [selectedIndex, setSelectedIndex] = useState<0 | 1>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [userParticipants, setUserParticipants] = useState<Map<string, ChallengeParticipant>>(new Map());

  useEffect(() => {
    if (selectedIndex === 0) {
      loadChallenges();
    }
  }, [selectedIndex, user?.id]);

  const loadChallenges = async () => {
    await loadActiveChallenges();
    
    // Load user participants
    if (user?.id) {
      const participants = await challengeParticipantsCollection
        .query(
          Q.where('user_id', user.id),
          Q.where('deleted_at', null)
        )
        .fetch();

      const participantMap = new Map<string, ChallengeParticipant>();
      participants.forEach((p) => {
        const typedP = p as ChallengeParticipant;
        participantMap.set(typedP.challengeId, typedP);
      });
      setUserParticipants(participantMap);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await syncDatabase();
      await loadChallenges();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSegmentChange = (index: number) => {
    setSelectedIndex(index as 0 | 1);
  };

  const handleJoin = async (challengeId: string) => {
    try {
      await joinChallenge(challengeId);
      await loadChallenges();
    } catch (error) {
      console.error('Error joining challenge:', error);
    }
  };

  const handleLeave = async (challengeId: string) => {
    try {
      await leaveChallenge(challengeId);
      await loadChallenges();
    } catch (error) {
      console.error('Error leaving challenge:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Compete</Text>
      </View>

      <View style={[styles.segmentedContainer, { backgroundColor: colors.surface }]}>
        <SegmentedControl
          values={['Challenges', 'Leaderboards']}
          selectedIndex={selectedIndex}
          onChange={handleSegmentChange}
        />
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
        {selectedIndex === 0 ? (
          activeChallenges.length === 0 ? (
            <EmptyState
              icon="🏆"
              title="No active challenges"
              message="Create a challenge or join one from your feed"
              actionLabel="View All Challenges"
              onAction={() => router.push('/challenges' as never)}
            />
          ) : (
            activeChallenges.map((challenge) => {
              const participant = userParticipants.get(challenge.id);
              return (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  userParticipant={participant}
                  onPress={() => router.push(`/challenges/${challenge.serverId}` as never)}
                  onJoin={() => handleJoin(challenge.serverId)}
                  onLeave={() => handleLeave(challenge.serverId)}
                />
              );
            })
          )
        ) : (
          <View style={styles.placeholder}>
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              Leaderboards
            </Text>
            <Text style={[styles.placeholderSubtext, { color: colors.textMuted }]}>
              See how you rank against other lifters
            </Text>
            <TouchableOpacity
              style={[styles.viewButton, { backgroundColor: colors.primary, marginTop: 16 }]}
              onPress={() => router.push('/leaderboards' as never)}
            >
              <Text style={[styles.viewButtonText, { color: colors.background }]}>View All Leaderboards</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {selectedIndex === 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/challenges' as never)}
          accessible={true}
          accessibilityLabel="View all challenges"
          accessibilityRole="button"
        >
          <Text style={[styles.fabText, { color: colors.background }]}>All</Text>
        </TouchableOpacity>
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
  segmentedContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
