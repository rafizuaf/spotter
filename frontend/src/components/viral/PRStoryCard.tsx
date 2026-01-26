/**
 * PRStoryCard Component
 * Phase 2G: Social & Competition - Instagram Story Sharing
 * 
 * PR celebration Instagram Story card
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import InstagramStoryTemplate from './InstagramStoryTemplate';
import type { StoryData } from '../../services/storySharing';

interface PRStoryCardProps {
  data: StoryData;
  variant?: 'dark' | 'light' | 'transparent';
}

export default function PRStoryCard({ data, variant = 'dark' }: PRStoryCardProps) {
  if (!data.pr) return null;

  const { pr } = data;
  const isDark = variant === 'dark';
  const textColor = isDark ? '#f5f5f5' : '#1a1a1a';
  const accentColor = '#d4af37';

  return (
    <InstagramStoryTemplate
      variant={variant}
      title="NEW PR!"
      subtitle={pr.exerciseName}
    >
      <View style={styles.prContainer}>
        <Text style={[styles.oldValue, { color: textColor }]}>
          {pr.oldValue}kg
        </Text>
        <Text style={[styles.arrow, { color: accentColor }]}>→</Text>
        <Text style={[styles.newValue, { color: accentColor }]}>
          {pr.newValue}kg
        </Text>
      </View>

      <View style={styles.improvement}>
        <Text style={[styles.improvementText, { color: accentColor }]}>
          +{pr.improvement}kg
        </Text>
        <Text style={[styles.improvementLabel, { color: textColor }]}>
          Personal Record
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: textColor }]}>
          {pr.date.toLocaleDateString()}
        </Text>
      </View>
    </InstagramStoryTemplate>
  );
}

const styles = StyleSheet.create({
  prContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 200,
  },
  oldValue: {
    fontSize: 64,
    fontWeight: '600',
    marginRight: 32,
  },
  arrow: {
    fontSize: 80,
    fontWeight: 'bold',
    marginHorizontal: 24,
  },
  newValue: {
    fontSize: 96,
    fontWeight: 'bold',
    marginLeft: 32,
  },
  improvement: {
    marginTop: 80,
    alignItems: 'center',
  },
  improvementText: {
    fontSize: 72,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  improvementLabel: {
    fontSize: 28,
    fontWeight: '600',
    textTransform: 'uppercase',
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
