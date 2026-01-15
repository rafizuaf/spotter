/**
 * AstrologyCard - Monthly gym archetype card
 *
 * Visual Aesthetic: Industrial Luxury / Tarot Card
 * - Industrial borders with gothic accents
 * - High contrast archetype icon
 * - Distressed texture overlay (implied)
 * - Mystical/Roast copywriting style
 *
 * This component is designed to be captured via react-native-view-shot
 * and shared to Instagram Stories or saved to Photos.
 */

import React, { forwardRef, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AstrologyCardProps, MonthlyArchetypeStats } from './types';

/**
 * Get icon name for each archetype
 */
const getArchetypeIcon = (
  archetype: MonthlyArchetypeStats['archetype']
): keyof typeof Ionicons.glyphMap => {
  switch (archetype) {
    case 'VAMPIRE':
      return 'moon-outline';
    case 'BENCH_LORD':
      return 'barbell-outline';
    case 'SCIENTIST':
      return 'flask-outline';
    case 'THE_MACHINE':
      return 'cog-outline';
    case 'THE_GHOST':
      return 'skull-outline';
    case 'CARDIO_CAPYBARA':
      return 'heart-outline';
    case 'DEFAULT':
    default:
      return 'flame-outline';
  }
};

/**
 * AstrologyCard Component
 *
 * Renders a monthly archetype in tarot card style.
 * Always renders in Black & White with gold accents for shareability.
 *
 * forwardRef is used to allow parent components to capture this view
 * using react-native-view-shot.
 */
const AstrologyCard = forwardRef<View, AstrologyCardProps>(
  ({ archetype }, ref) => {
    const { title, copy, stats } = archetype;
    const iconName = getArchetypeIcon(archetype.archetype);

    return (
      <View ref={ref} style={styles.container}>
        {/* Outer frame */}
        <View style={styles.outerFrame}>
          {/* Corner decorations */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />

          {/* Inner content */}
          <View style={styles.innerContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.monthText}>{stats.month.toUpperCase()}</Text>
              <Text style={styles.headerSubtitle}>YOUR GYM ARCHETYPE</Text>
            </View>

            {/* Decorative line */}
            <View style={styles.decorativeLine}>
              <View style={styles.lineSegment} />
              <View style={styles.diamond} />
              <View style={styles.lineSegment} />
            </View>

            {/* Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconFrame}>
                <Ionicons name={iconName} size={64} color="#000000" />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>{title.toUpperCase()}</Text>

            {/* Decorative line */}
            <View style={styles.decorativeLineSmall}>
              <View style={styles.lineSegmentSmall} />
              <View style={styles.diamondSmall} />
              <View style={styles.lineSegmentSmall} />
            </View>

            {/* Copy */}
            <View style={styles.copyContainer}>
              <Text style={styles.copyText}>{copy}</Text>
            </View>

            {/* Stats Section */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
                <Text style={styles.statLabel}>SESSIONS</Text>
              </View>
              {stats.nightWorkouts !== undefined && stats.nightWorkouts > 0 && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.nightWorkouts}</Text>
                  <Text style={styles.statLabel}>NIGHT OPS</Text>
                </View>
              )}
              {stats.favoriteTime && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.favoriteTime}</Text>
                  <Text style={styles.statLabel}>PRIME TIME</Text>
                </View>
              )}
            </View>

            {/* Top muscle */}
            {stats.topMuscleGroup && (
              <View style={styles.muscleContainer}>
                <Text style={styles.muscleLabel}>MOST PUNISHED</Text>
                <Text style={styles.muscleValue}>
                  {stats.topMuscleGroup.toUpperCase()}
                </Text>
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.footerLine} />
              <Text style={styles.footerText}>SPOTTER</Text>
              <View style={styles.footerLine} />
            </View>
          </View>
        </View>
      </View>
    );
  }
);

AstrologyCard.displayName = 'AstrologyCard';

/**
 * Styles - Industrial Luxury / Tarot Card Aesthetic
 *
 * CRITICAL: This component uses Black & White with gold-like accents
 * to ensure consistent shareability across Instagram Stories.
 */
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0A0A0A',
    padding: 8,
    // Shadow for depth
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  outerFrame: {
    backgroundColor: '#FAFAFA',
    borderWidth: 3,
    borderColor: '#000000',
    padding: 16,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#000000',
  },
  topLeft: {
    top: 8,
    left: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  topRight: {
    top: 8,
    right: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  bottomLeft: {
    bottom: 8,
    left: 8,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  bottomRight: {
    bottom: 8,
    right: 8,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  innerContent: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  monthText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666666',
    letterSpacing: 4,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333333',
    letterSpacing: 2,
  },
  decorativeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    width: '80%',
  },
  lineSegment: {
    flex: 1,
    height: 1,
    backgroundColor: '#000000',
  },
  diamond: {
    width: 8,
    height: 8,
    backgroundColor: '#000000',
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 8,
  },
  decorativeLineSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    width: '60%',
  },
  lineSegmentSmall: {
    flex: 1,
    height: 1,
    backgroundColor: '#CCCCCC',
  },
  diamondSmall: {
    width: 6,
    height: 6,
    backgroundColor: '#333333',
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 6,
  },
  iconContainer: {
    marginVertical: 16,
  },
  iconFrame: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 3,
    textAlign: 'center',
    marginVertical: 8,
  },
  copyContainer: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  copyText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#333333',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 70,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    fontFamily: 'monospace',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 1,
    marginTop: 2,
  },
  muscleContainer: {
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    width: '80%',
  },
  muscleLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 2,
  },
  muscleValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    width: '60%',
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#CCCCCC',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '400',
    color: '#999999',
    letterSpacing: 4,
    marginHorizontal: 12,
  },
});

export default memo(AstrologyCard);
