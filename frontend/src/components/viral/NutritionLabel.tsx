/**
 * NutritionLabel - FDA-style workout stats card
 *
 * Visual Aesthetic: Industrial Luxury / Streetwear Tag
 * - Stark Black & White contrast (always, regardless of app theme)
 * - Bold condensed typography
 * - FDA nutrition facts layout
 * - Sarcastic, gym-culture copywriting
 *
 * This component is designed to be captured via react-native-view-shot
 * and shared to Instagram Stories or saved to Photos.
 */

import React, { forwardRef, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NutritionLabelProps } from './types';

/**
 * Format large numbers with commas
 */
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US', { maximumFractionDigits: 1 });
};

/**
 * Format date for display
 */
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * NutritionLabel Component
 *
 * Renders a workout summary in FDA nutrition facts style.
 * Always renders in Black & White for shareability.
 *
 * forwardRef is used to allow parent components to capture this view
 * using react-native-view-shot.
 */
const NutritionLabel = forwardRef<View, NutritionLabelProps>(
  ({ stats, workoutName, date }, ref) => {
    const {
      totalVolumeKg,
      setsCompleted,
      durationMinutes,
      exercisesCount,
      muscleGroups,
      prsHit,
      painPercent,
      sweatLiters,
      regretPercent,
    } = stats;

    // Format duration as hours and minutes
    const hours = Math.floor(durationMinutes / 60);
    const minutes = Math.round(durationMinutes % 60);
    const durationDisplay =
      hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    // Get top 3 muscle groups for display
    const topMuscles = muscleGroups.slice(0, 3).join(', ') || 'Full Body';

    return (
      <View ref={ref} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandText}>SPOTTER</Text>
          <Text style={styles.title}>NUTRITION FACTS</Text>
          <Text style={styles.subtitle}>PER SERVING: 1 WORKOUT</Text>
        </View>

        {/* Thick divider */}
        <View style={styles.thickDivider} />

        {/* Workout Name & Date */}
        <View style={styles.workoutInfo}>
          <Text style={styles.workoutName} numberOfLines={1}>
            {workoutName.toUpperCase()}
          </Text>
          <Text style={styles.workoutDate}>{formatDate(date)}</Text>
        </View>

        {/* Thin divider */}
        <View style={styles.thinDivider} />

        {/* Main Stats Section */}
        <View style={styles.statsSection}>
          {/* Iron Moved (Volume) */}
          <View style={styles.statRow}>
            <View style={styles.statLabelContainer}>
              <Text style={styles.statLabelBold}>Iron Moved</Text>
            </View>
            <Text style={styles.statValue}>
              {formatNumber(totalVolumeKg)}kg
            </Text>
          </View>

          {/* Pain Level */}
          <View style={styles.statRow}>
            <View style={styles.statLabelContainer}>
              <Text style={styles.statLabel}>Pain Level</Text>
              <Text style={styles.dailyValue}>% Daily Value*</Text>
            </View>
            <Text style={styles.statValueBold}>{painPercent}%</Text>
          </View>

          {/* Sweat */}
          <View style={styles.statRow}>
            <View style={styles.statLabelContainer}>
              <Text style={styles.statLabel}>Sweat</Text>
            </View>
            <Text style={styles.statValue}>{sweatLiters}L</Text>
          </View>

          {/* Sets Completed */}
          <View style={styles.statRow}>
            <View style={styles.statLabelContainer}>
              <Text style={styles.statLabel}>Sets Completed</Text>
            </View>
            <Text style={styles.statValue}>{setsCompleted}</Text>
          </View>

          {/* Exercises */}
          <View style={styles.statRow}>
            <View style={styles.statLabelContainer}>
              <Text style={styles.statLabel}>Exercises</Text>
            </View>
            <Text style={styles.statValue}>{exercisesCount}</Text>
          </View>

          {/* Duration */}
          <View style={styles.statRow}>
            <View style={styles.statLabelContainer}>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <Text style={styles.statValue}>{durationDisplay}</Text>
          </View>

          {/* PRs Hit */}
          {prsHit > 0 && (
            <View style={styles.statRow}>
              <View style={styles.statLabelContainer}>
                <Text style={styles.statLabelBold}>PRs Hit</Text>
              </View>
              <Text style={styles.statValueBold}>{prsHit}</Text>
            </View>
          )}

          {/* Regret (only show if non-zero - leg day skipper) */}
          {regretPercent > 0 && (
            <View style={styles.statRow}>
              <View style={styles.statLabelContainer}>
                <Text style={styles.statLabelBold}>Regret</Text>
              </View>
              <Text style={styles.statValueBold}>{regretPercent}%</Text>
            </View>
          )}
        </View>

        {/* Thin divider */}
        <View style={styles.thinDivider} />

        {/* Muscle Groups */}
        <View style={styles.muscleSection}>
          <Text style={styles.muscleLabel}>MUSCLES WORKED</Text>
          <Text style={styles.muscleValue}>{topMuscles}</Text>
        </View>

        {/* Thick divider */}
        <View style={styles.thickDivider} />

        {/* Ingredients Section */}
        <View style={styles.ingredientsSection}>
          <Text style={styles.ingredientsTitle}>INGREDIENTS:</Text>
          <Text style={styles.ingredientsText}>
            100% Pain, 0g Mercy, Trace amounts of Pre-workout,
            {'\n'}Questionable Form, Ego (Crushed), Zero Excuses
          </Text>
        </View>

        {/* Thin divider */}
        <View style={styles.thinDivider} />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            *Percent Daily Values based on a diet of protein shakes and
            disappointment. Individual suffering may vary. Not responsible
            for DOMS, gym crushes, or mirror flexing.
          </Text>
          <View style={styles.footerDivider} />
          <Text style={styles.disclaimer}>
            NO REFUNDS ON GAINS{'\n'}KEEP RECEIPT FOR THERAPIST
          </Text>
        </View>
      </View>
    );
  }
);

NutritionLabel.displayName = 'NutritionLabel';

/**
 * Styles - Industrial Luxury / Streetwear Tag Aesthetic
 *
 * CRITICAL: This component is ALWAYS Black & White regardless of app theme.
 * This ensures consistent shareability across Instagram Stories.
 */
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    padding: 16,
    width: 320,
    // Shadow for depth
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  brandText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '400',
    color: '#666666',
    letterSpacing: 4,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    marginTop: 4,
  },
  workoutInfo: {
    paddingVertical: 8,
  },
  workoutName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  workoutDate: {
    fontSize: 11,
    fontWeight: '400',
    color: '#666666',
    marginTop: 2,
  },
  thickDivider: {
    height: 8,
    backgroundColor: '#000000',
    marginVertical: 8,
  },
  thinDivider: {
    height: 1,
    backgroundColor: '#000000',
    marginVertical: 8,
  },
  statsSection: {
    paddingVertical: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statLabelContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: '#000000',
  },
  statLabelBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  dailyValue: {
    fontSize: 9,
    fontWeight: '400',
    color: '#666666',
    fontStyle: 'italic',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'monospace',
  },
  statValueBold: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    fontFamily: 'monospace',
  },
  muscleSection: {
    paddingVertical: 8,
  },
  muscleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
    marginBottom: 4,
  },
  muscleValue: {
    fontSize: 12,
    fontWeight: '400',
    color: '#333333',
  },
  ingredientsSection: {
    paddingVertical: 8,
  },
  ingredientsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
    marginBottom: 4,
  },
  ingredientsText: {
    fontSize: 10,
    fontWeight: '400',
    color: '#333333',
    lineHeight: 14,
  },
  footer: {
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    fontWeight: '400',
    color: '#666666',
    lineHeight: 11,
  },
  footerDivider: {
    height: 1,
    backgroundColor: '#CCCCCC',
    marginVertical: 8,
  },
  disclaimer: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 14,
  },
});

export default memo(NutritionLabel);
