/**
 * ReactionButton Component
 * Phase 2G: Social & Competition - Feed Reactions
 * 
 * Individual reaction button (emoji + count)
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { ReactionType } from '../db/models/PostReaction';
import { REACTION_EMOJI } from '../db/models/PostReaction';

interface ReactionButtonProps {
  type: ReactionType;
  count: number;
  isActive: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export default function ReactionButton({
  type,
  count,
  isActive,
  onPress,
  disabled = false,
}: ReactionButtonProps) {
  const colors = useTheme();
  const emoji = REACTION_EMOJI[type];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: isActive ? colors.primary + '20' : 'transparent',
          borderColor: isActive ? colors.primary : colors.border,
        },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessible={true}
      accessibilityLabel={`${type} reaction, ${count} ${count === 1 ? 'reaction' : 'reactions'}`}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: isActive }}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      {count > 0 && (
        <Text
          style={[
            styles.count,
            {
              color: isActive ? colors.primary : colors.textSecondary,
            },
          ]}
        >
          {count > 99 ? '99+' : count}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 50,
    marginHorizontal: 4,
  },
  disabled: {
    opacity: 0.5,
  },
  emoji: {
    fontSize: 18,
    marginRight: 4,
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
  },
});
