/**
 * Tombstone - Failed PR memorial card
 *
 * Visual Aesthetic: Gothic Stone Engraving
 * - Marble/granite gradient background
 * - Serif font with crack effects (implied)
 * - Dark humor epitaph style
 *
 * This component is designed to be captured via react-native-view-shot
 * and shared to Instagram Stories or saved to Photos.
 */

import React, { forwardRef, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TombstoneProps } from './types';

/**
 * Format date for epitaph
 */
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format weight for display
 */
const formatWeight = (kg: number): string => {
  return `${kg.toLocaleString('en-US', { maximumFractionDigits: 1 })}kg`;
};

/**
 * Tombstone Component
 *
 * Renders a failed PR as a gothic tombstone memorial.
 * Uses gray stone colors for authentic cemetery aesthetic.
 *
 * forwardRef is used to allow parent components to capture this view
 * using react-native-view-shot.
 */
const Tombstone = forwardRef<View, TombstoneProps>(
  ({ exerciseName, attemptedWeight, failedAt, reps = 0 }, ref) => {
    return (
      <View ref={ref} style={styles.container}>
        {/* Ground/grass base */}
        <View style={styles.ground} />

        {/* Tombstone shape */}
        <View style={styles.stone}>
          {/* Rounded top */}
          <View style={styles.stoneTop} />

          {/* Main stone body */}
          <View style={styles.stoneBody}>
            {/* Cross decoration */}
            <View style={styles.crossContainer}>
              <View style={styles.crossVertical} />
              <View style={styles.crossHorizontal} />
            </View>

            {/* R.I.P. */}
            <Text style={styles.ripText}>R.I.P.</Text>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Main epitaph */}
            <View style={styles.epitaphSection}>
              <Text style={styles.epitaphLine1}>HERE LIES</Text>
              <Text style={styles.epitaphLine2}>YOUR EGO</Text>
            </View>

            {/* Crushed by */}
            <View style={styles.crushedSection}>
              <Text style={styles.crushedLabel}>CRUSHED BY</Text>
              <Text style={styles.weight}>{formatWeight(attemptedWeight)}</Text>
              <Text style={styles.exercise}>{exerciseName.toUpperCase()}</Text>
            </View>

            {/* Date */}
            <View style={styles.dateSection}>
              <Text style={styles.dateLabel}>{formatDate(failedAt)}</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Memorial message */}
            <View style={styles.memorialSection}>
              <Text style={styles.memorialText}>
                "It lifted heavy things,{'\n'}
                but couldn't lift this."
              </Text>
            </View>

            {/* Reps attempted */}
            {reps !== undefined && (
              <View style={styles.repsSection}>
                <Text style={styles.repsText}>
                  REPS COMPLETED: {reps}
                </Text>
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                GONE BUT NOT FORGOTTEN
              </Text>
              <Text style={styles.footerSubtext}>
                (You'll try again tomorrow)
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }
);

Tombstone.displayName = 'Tombstone';

/**
 * Styles - Gothic Stone Engraving Aesthetic
 *
 * Uses gray stone colors and serif-like fonts for cemetery feel.
 */
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 20,
    // Shadow for depth
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: '#2D4A2D',
    // Grass texture would be applied here
  },
  stone: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stoneTop: {
    width: 260,
    height: 60,
    backgroundColor: '#7A7A7A',
    borderTopLeftRadius: 130,
    borderTopRightRadius: 130,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: '#4A4A4A',
  },
  stoneBody: {
    width: 260,
    backgroundColor: '#8A8A8A',
    borderWidth: 3,
    borderTopWidth: 0,
    borderColor: '#4A4A4A',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    alignItems: 'center',
    // Stone texture gradient effect
  },
  crossContainer: {
    position: 'relative',
    width: 24,
    height: 32,
    marginBottom: 8,
  },
  crossVertical: {
    position: 'absolute',
    left: 10,
    top: 0,
    width: 4,
    height: 32,
    backgroundColor: '#3A3A3A',
  },
  crossHorizontal: {
    position: 'absolute',
    left: 0,
    top: 8,
    width: 24,
    height: 4,
    backgroundColor: '#3A3A3A',
  },
  ripText: {
    fontSize: 32,
    fontWeight: '400',
    color: '#1A1A1A',
    letterSpacing: 8,
    fontFamily: 'serif',
    textShadowColor: '#AAAAAA',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  divider: {
    width: '80%',
    height: 2,
    backgroundColor: '#4A4A4A',
    marginVertical: 12,
  },
  epitaphSection: {
    alignItems: 'center',
    marginVertical: 8,
  },
  epitaphLine1: {
    fontSize: 14,
    fontWeight: '400',
    color: '#2A2A2A',
    letterSpacing: 4,
    fontFamily: 'serif',
  },
  epitaphLine2: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 3,
    fontFamily: 'serif',
    marginTop: 4,
  },
  crushedSection: {
    alignItems: 'center',
    marginVertical: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#6A6A6A',
    borderRadius: 4,
  },
  crushedLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#CCCCCC',
    letterSpacing: 3,
  },
  weight: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  exercise: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DDDDDD',
    letterSpacing: 1,
    marginTop: 4,
    textAlign: 'center',
  },
  dateSection: {
    marginVertical: 8,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#3A3A3A',
    letterSpacing: 1,
    fontFamily: 'serif',
  },
  memorialSection: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 8,
  },
  memorialText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#3A3A3A',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
    fontFamily: 'serif',
  },
  repsSection: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#5A5A5A',
    borderRadius: 2,
  },
  repsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: 12,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3A3A3A',
    letterSpacing: 2,
  },
  footerSubtext: {
    fontSize: 9,
    fontWeight: '400',
    color: '#5A5A5A',
    fontStyle: 'italic',
    marginTop: 2,
  },
});

export default memo(Tombstone);
