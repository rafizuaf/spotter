import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import StrengthLevelBadge from './StrengthLevelBadge';
import {
  type StrengthRating,
  formatWeightWithUnit,
  formatPercentile,
  getStrengthLevelColor,
} from '../utils/strengthCalculations';
import type { Colors } from '../utils/colors';

interface StrengthStandardsCardProps {
  /** Name of the exercise (e.g., "Bench Press") */
  exerciseName: string;
  /** User's estimated 1RM in kg */
  userOneRepMax: number;
  /** Calculated strength rating */
  rating: StrengthRating;
  /** Weight unit preference */
  weightUnit: 'KG' | 'LBS';
  /** User's bodyweight for context */
  userBodyweight?: number;
  /** User's gender for context */
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
}

/**
 * StrengthStandardsCard
 *
 * A card displaying the user's strength for a specific exercise
 * compared to population standards.
 *
 * Shows:
 * - Exercise name and strength level badge
 * - User's 1RM
 * - Percentile progress bar
 * - Standard range for their bodyweight
 */
export default function StrengthStandardsCard({
  exerciseName,
  userOneRepMax,
  rating,
  weightUnit,
  userBodyweight,
  gender,
}: StrengthStandardsCardProps) {
  const colors = useTheme();
  const levelColor = getStrengthLevelColor(rating.level);
  const styles = createStyles(colors, levelColor);

  const formattedUserWeight = formatWeightWithUnit(userOneRepMax, weightUnit, 1);
  const formattedMin = formatWeightWithUnit(rating.standardMin, weightUnit, 0);
  const formattedMax = formatWeightWithUnit(rating.standardMax, weightUnit, 0);

  // Calculate progress bar width (capped at 100%)
  const progressWidth = Math.min(100, rating.percentile);

  // Format bodyweight category info
  const genderLabel = gender === 'FEMALE' ? 'female' : 'male';
  const categoryWeight = formatWeightWithUnit(rating.bodyweightCategory, weightUnit, 0);

  return (
    <View
      style={styles.card}
      accessible={true}
      accessibilityLabel={`${exerciseName}: Your estimated one rep max is ${formattedUserWeight}, rated ${rating.level}, ${formatPercentile(rating.percentile)}`}
    >
      {/* Header: Exercise name and level badge */}
      <View style={styles.header}>
        <Text style={styles.exerciseName}>{exerciseName.toUpperCase()}</Text>
        <StrengthLevelBadge level={rating.level} size="small" />
      </View>

      {/* User's 1RM */}
      <View style={styles.userStatRow}>
        <Text style={styles.userStatLabel}>Your 1RM:</Text>
        <Text style={styles.userStatValue}>{formattedUserWeight}</Text>
      </View>

      {/* Percentile Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressWidth}%` }]} />
        </View>
        <Text style={styles.percentileText}>{formatPercentile(rating.percentile)}</Text>
      </View>

      {/* Standard Range */}
      <Text style={styles.standardRange}>
        Standard for {categoryWeight} {genderLabel}: {formattedMin} - {formattedMax}
      </Text>
    </View>
  );
}

const createStyles = (colors: Colors, levelColor: string) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    exerciseName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: 0.5,
    },
    userStatRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 12,
    },
    userStatLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginRight: 8,
    },
    userStatValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    progressContainer: {
      marginBottom: 8,
    },
    progressTrack: {
      height: 8,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 4,
    },
    progressFill: {
      height: '100%',
      backgroundColor: levelColor,
      borderRadius: 4,
    },
    percentileText: {
      fontSize: 12,
      color: levelColor,
      fontWeight: '600',
    },
    standardRange: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
  });
