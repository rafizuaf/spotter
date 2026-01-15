/**
 * WantedPoster - Missing muscle group re-engagement card
 *
 * Visual Aesthetic: Old West / Cyberpunk Bounty Poster
 * - Distressed paper texture (implied)
 * - "WANTED" header in bold
 * - Police sketch style muscle icon
 * - Days missing counter
 * - Urgent/aggressive copywriting
 *
 * This component is designed to be captured via react-native-view-shot
 * and shared to Instagram Stories or saved to Photos.
 */

import React, { forwardRef, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WantedPosterProps } from './types';

/**
 * Get icon name for each muscle group
 */
const getMuscleIcon = (
  muscleGroup: string
): keyof typeof Ionicons.glyphMap => {
  const group = muscleGroup.toLowerCase();
  switch (group) {
    case 'legs':
      return 'footsteps-outline';
    case 'chest':
      return 'body-outline';
    case 'back':
      return 'arrow-back-outline';
    case 'shoulders':
      return 'triangle-outline';
    case 'arms':
      return 'fitness-outline';
    case 'core':
      return 'ellipse-outline';
    default:
      return 'help-circle-outline';
  }
};

/**
 * Get reward text for muscle group
 */
const getRewardText = (muscleGroup: string): string => {
  const group = muscleGroup.toLowerCase();
  switch (group) {
    case 'legs':
      return 'BIGGER CALVES & QUADS';
    case 'chest':
      return 'DEFINED PECS';
    case 'back':
      return 'WIDE LATS';
    case 'shoulders':
      return 'BOULDER SHOULDERS';
    case 'arms':
      return 'SLEEVE-BUSTING GUNS';
    case 'core':
      return 'VISIBLE ABS';
    default:
      return 'GAINS';
  }
};

/**
 * Format date for display
 */
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * WantedPoster Component
 *
 * Renders a missing muscle group as a wanted poster.
 * Always renders in Black & White with aged paper effect.
 *
 * forwardRef is used to allow parent components to capture this view
 * using react-native-view-shot.
 */
const WantedPoster = forwardRef<View, WantedPosterProps>(
  ({ muscleGroup, lastSeen, daysMissing, reward }, ref) => {
    const iconName = getMuscleIcon(muscleGroup);
    const rewardText = reward || getRewardText(muscleGroup);

    return (
      <View ref={ref} style={styles.container}>
        {/* Aged paper background */}
        <View style={styles.paper}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.wantedText}>WANTED</Text>
            <Text style={styles.subHeader}>DEAD OR ALIVE</Text>
            <Text style={styles.subHeaderSmall}>(PREFERABLY SORE)</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Muscle "Sketch" */}
          <View style={styles.sketchContainer}>
            <View style={styles.sketchFrame}>
              <Ionicons name={iconName} size={80} color="#333333" />
            </View>
          </View>

          {/* Muscle name */}
          <Text style={styles.muscleName}>{muscleGroup.toUpperCase()}</Text>

          {/* Crime description */}
          <View style={styles.crimeSection}>
            <Text style={styles.crimeLabel}>CRIME:</Text>
            <Text style={styles.crimeText}>
              Evading workout duty for {daysMissing} days
            </Text>
          </View>

          {/* Last seen */}
          <View style={styles.lastSeenSection}>
            <Text style={styles.lastSeenLabel}>LAST SEEN:</Text>
            <Text style={styles.lastSeenText}>{formatDate(lastSeen)}</Text>
            <Text style={styles.lastSeenDays}>({daysMissing} days ago)</Text>
          </View>

          {/* Divider */}
          <View style={styles.dividerThin} />

          {/* Reward */}
          <View style={styles.rewardSection}>
            <Text style={styles.rewardLabel}>REWARD:</Text>
            <Text style={styles.rewardText}>{rewardText}</Text>
          </View>

          {/* Warning */}
          <View style={styles.warningSection}>
            <Text style={styles.warningText}>
              SUBJECT IS CONSIDERED{'\n'}EXTREMELY NEGLECTED
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              If found, train immediately.
            </Text>
            <Text style={styles.footerText}>
              No questions asked.
            </Text>
          </View>

          {/* Corner decorations */}
          <View style={[styles.cornerDeco, styles.topLeft]}>
            <Text style={styles.cornerX}>X</Text>
          </View>
          <View style={[styles.cornerDeco, styles.topRight]}>
            <Text style={styles.cornerX}>X</Text>
          </View>
          <View style={[styles.cornerDeco, styles.bottomLeft]}>
            <Text style={styles.cornerX}>X</Text>
          </View>
          <View style={[styles.cornerDeco, styles.bottomRight]}>
            <Text style={styles.cornerX}>X</Text>
          </View>
        </View>
      </View>
    );
  }
);

WantedPoster.displayName = 'WantedPoster';

/**
 * Styles - Old West / Cyberpunk Bounty Poster Aesthetic
 *
 * CRITICAL: This component uses aged paper colors for shareability.
 */
const styles = StyleSheet.create({
  container: {
    padding: 8,
    // Shadow for depth
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  paper: {
    backgroundColor: '#F5F0E6',
    borderWidth: 3,
    borderColor: '#3D3D3D',
    padding: 20,
    width: 300,
    position: 'relative',
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  wantedText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: 8,
    textShadowColor: '#666666',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  subHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
    letterSpacing: 6,
    marginTop: 4,
  },
  subHeaderSmall: {
    fontSize: 10,
    fontWeight: '400',
    color: '#666666',
    letterSpacing: 2,
    marginTop: 2,
    fontStyle: 'italic',
  },
  divider: {
    height: 3,
    backgroundColor: '#1A1A1A',
    marginVertical: 12,
  },
  dividerThin: {
    height: 1,
    backgroundColor: '#999999',
    marginVertical: 12,
  },
  sketchContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  sketchFrame: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: '#333333',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    // Dashed border effect simulated with multiple borders
  },
  muscleName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1A1A1A',
    textAlign: 'center',
    letterSpacing: 4,
    marginVertical: 8,
  },
  crimeSection: {
    alignItems: 'center',
    marginVertical: 8,
  },
  crimeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 2,
  },
  crimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginTop: 4,
  },
  lastSeenSection: {
    alignItems: 'center',
    marginVertical: 8,
  },
  lastSeenLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 2,
  },
  lastSeenText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
    marginTop: 4,
  },
  lastSeenDays: {
    fontSize: 10,
    fontWeight: '400',
    color: '#999999',
    fontStyle: 'italic',
  },
  rewardSection: {
    alignItems: 'center',
    marginVertical: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#333333',
    backgroundColor: '#FFFFFF',
  },
  rewardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 3,
  },
  rewardText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1A1A1A',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 1,
  },
  warningSection: {
    alignItems: 'center',
    marginVertical: 12,
    padding: 8,
    backgroundColor: '#1A1A1A',
  },
  warningText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F5F0E6',
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 14,
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '400',
    color: '#666666',
    fontStyle: 'italic',
    lineHeight: 14,
  },
  cornerDeco: {
    position: 'absolute',
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLeft: {
    top: 8,
    left: 8,
  },
  topRight: {
    top: 8,
    right: 8,
  },
  bottomLeft: {
    bottom: 8,
    left: 8,
  },
  bottomRight: {
    bottom: 8,
    right: 8,
  },
  cornerX: {
    fontSize: 16,
    fontWeight: '400',
    color: '#999999',
  },
});

export default memo(WantedPoster);
