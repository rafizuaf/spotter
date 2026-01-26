/**
 * Challenges List Screen
 * Phase 2G: Social & Competition - Challenge System
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useChallengeStore } from '../../src/stores/challengeStore';
import { useAuthStore } from '../../src/stores/authStore';
import ChallengeCard from '../../src/components/ChallengeCard';
import CreateChallengeModal from '../../src/components/CreateChallengeModal';
import EmptyState from '../../src/components/EmptyState';
import { syncDatabase } from '../../src/db/sync';
import type Challenge from '../../src/db/models/Challenge';
import type ChallengeParticipant from '../../src/db/models/ChallengeParticipant';
import { Q } from '@nozbe/watermelondb';
import { challengeParticipantsCollection } from '../../src/db';

type FilterTab = 'active' | 'my' | 'completed';

export default function ChallengesScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { user } = useAuthStore();
  const {
    activeChallenges,
    myChallenges,
    loadActiveChallenges,
    loadMyChallenges,
    joinChallenge,
    leaveChallenge,
    loading,
  } = useChallengeStore();

  const [filterTab, setFilterTab] = useState<FilterTab>('active');
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [userParticipants, setUserParticipants] = useState<Map<string, ChallengeParticipant>>(new Map());

  useEffect(() => {
    loadData();
  }, [user?.id, filterTab]);

  const loadData = async () => {
    if (filterTab === 'active') {
      await loadActiveChallenges();
    } else if (filterTab === 'my') {
      await loadMyChallenges();
    }

    // Load user participants for all challenges
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
      await loadData();
    } catch (error) {
      console.error('Error refreshing challenges:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleJoin = async (challengeId: string) => {
    try {
      await joinChallenge(challengeId);
      await loadData();
    } catch (error) {
      console.error('Error joining challenge:', error);
    }
  };

  const handleLeave = async (challengeId: string) => {
    try {
      await leaveChallenge(challengeId);
      await loadData();
    } catch (error) {
      console.error('Error leaving challenge:', error);
    }
  };

  const handleCreateSuccess = () => {
    loadData();
  };

  const getChallengesForTab = (): Challenge[] => {
    if (filterTab === 'active') {
      return activeChallenges;
    } else if (filterTab === 'my') {
      return myChallenges;
    } else {
      // Completed - filter from active
      return activeChallenges.filter((c) => c.status === 'COMPLETED');
    }
  };

  const renderChallenge = ({ item }: { item: Challenge }) => {
    const participant = userParticipants.get(item.id);
    return (
      <ChallengeCard
        challenge={item}
        userParticipant={participant}
        onPress={() => router.push(`/challenges/${item.serverId}` as never)}
        onJoin={() => handleJoin(item.serverId)}
        onLeave={() => handleLeave(item.serverId)}
      />
    );
  };

  const challenges = getChallengesForTab();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Challenges</Text>
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['active', 'my', 'completed'] as FilterTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              filterTab === tab && { borderBottomColor: colors.primary },
            ]}
            onPress={() => setFilterTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: filterTab === tab ? colors.primary : colors.textSecondary,
                  fontWeight: filterTab === tab ? '600' : '400',
                },
              ]}
            >
              {tab === 'active' ? 'Active' : tab === 'my' ? 'My Challenges' : 'Completed'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlashList
        data={challenges}
        renderItem={renderChallenge}
        keyExtractor={(item) => item.id}
        estimatedItemSize={150}
        contentContainerStyle={
          challenges.length === 0
            ? { ...styles.listContent, ...styles.emptyListContent }
            : styles.listContent
        }
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
            title={
              filterTab === 'active'
                ? 'No active challenges'
                : filterTab === 'my'
                ? 'No challenges yet'
                : 'No completed challenges'
            }
            message={
              filterTab === 'active'
                ? 'Create a challenge or join one from your feed'
                : filterTab === 'my'
                ? 'Create your first challenge to compete with friends'
                : 'Complete challenges to see them here'
            }
            actionLabel={filterTab === 'my' ? 'Create Challenge' : undefined}
            onAction={filterTab === 'my' ? () => setCreateModalVisible(true) : undefined}
          />
        }
        ListFooterComponent={loading && challenges.length > 0 ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.footerLoader} />
        ) : null}
      />

      {filterTab === 'active' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setCreateModalVisible(true)}
          accessible={true}
          accessibilityLabel="Create new challenge"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={28} color={colors.background} />
        </TouchableOpacity>
      )}

      <CreateChallengeModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={handleCreateSuccess}
      />
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
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flex: 1,
  },
  footerLoader: {
    marginVertical: 16,
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
});
