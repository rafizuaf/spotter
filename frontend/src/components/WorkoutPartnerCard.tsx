/**
 * WorkoutPartnerCard Component
 * Phase 2G: Social & Competition - Workout Partners
 * 
 * Card showing active workout partners
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import type WorkoutPartner from '../db/models/WorkoutPartner';
import type User from '../db/models/User';

interface WorkoutPartnerCardProps {
  partner: WorkoutPartner;
  user?: User;
  onPress?: () => void;
  onRemove?: () => void;
}

export default function WorkoutPartnerCard({
  partner,
  user,
  onPress,
  onRemove,
}: WorkoutPartnerCardProps) {
  const colors = useTheme();

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessible={true}
      accessibilityLabel={`Workout partner ${user?.username || 'User'}`}
    >
      <View style={styles.content}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.background }]}>
            {user?.username?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.username, { color: colors.textPrimary }]} numberOfLines={1}>
            {user?.username || 'Unknown User'}
          </Text>
          <Text style={[styles.status, { color: colors.textSecondary }]}>
            {partner.status === 'ACTIVE' ? 'Training together' : 'Left'}
          </Text>
        </View>
      </View>
      {onRemove && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={onRemove}
          accessible={true}
          accessibilityLabel="Remove partner"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
  },
  removeButton: {
    padding: 4,
  },
});
