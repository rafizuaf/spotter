/**
 * AchievementStoryCard Component
 * Phase 2G: Social & Competition - Instagram Story Sharing
 * 
 * Achievement/badge unlock Instagram Story card
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import InstagramStoryTemplate from './InstagramStoryTemplate';
import type { StoryData } from '../../services/storySharing';

interface AchievementStoryCardProps {
  data: StoryData;
  variant?: 'dark' | 'light' | 'transparent';
}

export default function AchievementStoryCard({
  data,
  variant = 'dark',
}: AchievementStoryCardProps) {
  if (!data.achievement) return null;

  const { achievement } = data;
  const isDark = variant === 'dark';
  const textColor = isDark ? '#f5f5f5' : '#1a1a1a';
  const accentColor = '#d4af37';

  return (
    <InstagramStoryTemplate variant={variant} title="🏆 Achievement Unlocked">
      <View style={styles.achievementContainer}>
        <Text style={[styles.achievementTitle, { color: accentColor }]}>
          {achievement.title}
        </Text>
        <Text style={[styles.achievementDescription, { color: textColor }]}>
          {achievement.description}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: textColor }]}>
          Earned {achievement.earnedAt.toLocaleDateString()}
        </Text>
      </View>
    </InstagramStoryTemplate>
  );
}

const styles = StyleSheet.create({
  achievementContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 200,
    paddingHorizontal: 60,
  },
  achievementTitle: {
    fontSize: 64,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
  },
  achievementDescription: {
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 48,
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
