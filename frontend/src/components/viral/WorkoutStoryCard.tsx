/**
 * WorkoutStoryCard Component
 * Phase 2G: Social & Competition - Instagram Story Sharing
 * 
 * Workout-specific Instagram Story card
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import InstagramStoryTemplate from './InstagramStoryTemplate';
import type { StoryData } from '../../services/storySharing';

interface WorkoutStoryCardProps {
  data: StoryData;
  variant?: 'dark' | 'light' | 'transparent';
}

export default function WorkoutStoryCard({ data, variant = 'dark' }: WorkoutStoryCardProps) {
  if (!data.workout) return null;

  const { workout } = data;
  const isDark = variant === 'dark';
  const textColor = isDark ? '#f5f5f5' : '#1a1a1a';
  const accentColor = '#d4af37';

  return (
    <InstagramStoryTemplate variant={variant} title={workout.name} subtitle="Workout Complete">
      <View style={styles.statsContainer}>
        <View style={styles.statRow}>
          <Text style={[styles.statValue, { color: accentColor }]}>
            {workout.stats.totalVolumeKg.toLocaleString()}kg
          </Text>
          <Text style={[styles.statLabel, { color: textColor }]}>Volume Moved</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={[styles.statValue, { color: accentColor }]}>
            {workout.stats.setsCompleted}
          </Text>
          <Text style={[styles.statLabel, { color: textColor }]}>Sets</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={[styles.statValue, { color: accentColor }]}>
            {workout.stats.durationMinutes}m
          </Text>
          <Text style={[styles.statLabel, { color: textColor }]}>Duration</Text>
        </View>

        {workout.stats.prsHit > 0 && (
          <View style={styles.prBadge}>
            <Text style={[styles.prText, { color: accentColor }]}>
              {workout.stats.prsHit} PR{workout.stats.prsHit > 1 ? 's' : ''} 🔥
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: textColor }]}>
          {workout.date.toLocaleDateString()}
        </Text>
      </View>
    </InstagramStoryTemplate>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 200,
  },
  statRow: {
    alignItems: 'center',
    marginBottom: 40,
    minWidth: 200,
  },
  statValue: {
    fontSize: 72,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 24,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  prBadge: {
    marginTop: 40,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  prText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 24,
    fontWeight: '600',
  },
});
