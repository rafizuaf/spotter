/**
 * ReactionBar Component
 * Phase 2G: Social & Competition - Feed Reactions
 * 
 * Full reaction bar with 4 reaction buttons (Like, Fire, Muscle, Clap)
 */

import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import ReactionButton from './ReactionButton';
import { reactToPost } from '../services/reactions';
import { logError } from '../utils/errorHandler';
import type { ReactionType } from '../db/models/PostReaction';
import { REACTION_TYPES } from '../db/models/PostReaction';
import * as Haptics from 'expo-haptics';

interface ReactionBarProps {
  postId: string;
  reactions: {
    like: number;
    fire: number;
    muscle: number;
    clap: number;
  };
  userReaction: ReactionType | null;
  onReaction?: (type: ReactionType, action: 'added' | 'removed') => void;
  disabled?: boolean;
}

export default function ReactionBar({
  postId,
  reactions,
  userReaction,
  onReaction,
  disabled = false,
}: ReactionBarProps) {
  const colors = useTheme();
  const [loading, setLoading] = useState(false);
  const [optimisticReactions, setOptimisticReactions] = useState(reactions);
  const [optimisticUserReaction, setOptimisticUserReaction] = useState<ReactionType | null>(userReaction);

  const handleReaction = async (type: ReactionType) => {
    if (disabled || loading) return;

    // Optimistic update
    const wasActive = optimisticUserReaction === type;
    const currentCount = optimisticReactions[type.toLowerCase() as keyof typeof optimisticReactions];
    
    setOptimisticUserReaction(wasActive ? null : type);
    setOptimisticReactions((prev) => ({
      ...prev,
      [type.toLowerCase()]: wasActive ? Math.max(0, currentCount - 1) : currentCount + 1,
    }));

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setLoading(true);
    try {
      const response = await reactToPost(postId, type);
      
      // Update with server response
      setOptimisticReactions({
        like: response.reaction_counts.like,
        fire: response.reaction_counts.fire,
        muscle: response.reaction_counts.muscle,
        clap: response.reaction_counts.clap,
      });
      setOptimisticUserReaction(response.action === 'added' ? type : null);

      // Callback
      if (onReaction) {
        onReaction(type, response.action);
      }
    } catch (error) {
      logError(error, 'ReactionBar_react');
      // Revert optimistic update on error
      setOptimisticUserReaction(userReaction);
      setOptimisticReactions(reactions);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { borderTopColor: colors.border }]}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      <View style={styles.buttonsContainer}>
        {REACTION_TYPES.map((type) => {
          const count = optimisticReactions[type.toLowerCase() as keyof typeof optimisticReactions];
          const isActive = optimisticUserReaction === type;

          return (
            <ReactionButton
              key={type}
              type={type}
              count={count}
              isActive={isActive}
              onPress={() => handleReaction(type)}
              disabled={disabled || loading}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    position: 'relative',
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
});
