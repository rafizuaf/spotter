/**
 * Strength Calculations Utility
 *
 * Functions for comparing user lifts against population benchmarks
 * to determine strength level and percentile ranking.
 */

import {
  STRENGTH_STANDARDS,
  BODYWEIGHT_CATEGORIES_MALE,
  BODYWEIGHT_CATEGORIES_FEMALE,
  getStandardExercise,
  type StrengthLevel,
} from '../constants/strengthStandards';
import { calculate1RM } from './performance';

export interface StrengthRating {
  /** Strength level classification */
  level: StrengthLevel;
  /** Percentile ranking (0-100) */
  percentile: number;
  /** Lower bound of current level's standard */
  standardMin: number;
  /** Upper bound of current level's standard */
  standardMax: number;
  /** Bodyweight category used for calculation */
  bodyweightCategory: number;
  /** Whether this exercise has standards data */
  hasStandards: boolean;
}

/**
 * Find the closest bodyweight category for the user's weight
 */
export function findClosestBodyweightCategory(
  bodyweightKg: number,
  gender: 'MALE' | 'FEMALE' | 'OTHER'
): number {
  const categories =
    gender === 'FEMALE' ? BODYWEIGHT_CATEGORIES_FEMALE : BODYWEIGHT_CATEGORIES_MALE;

  // Find closest category
  let closest = categories[0];
  let minDiff = Math.abs(bodyweightKg - closest);

  for (const category of categories) {
    const diff = Math.abs(bodyweightKg - category);
    if (diff < minDiff) {
      minDiff = diff;
      closest = category;
    }
  }

  return closest;
}

/**
 * Calculate strength rating for a given exercise and 1RM
 */
export function calculateStrengthRating(
  exerciseName: string,
  oneRepMax: number,
  bodyweightKg: number,
  gender: 'MALE' | 'FEMALE' | 'OTHER'
): StrengthRating {
  // Get standard exercise name
  const standardExercise = getStandardExercise(exerciseName);

  if (!standardExercise) {
    return {
      level: 'Untrained',
      percentile: 0,
      standardMin: 0,
      standardMax: 0,
      bodyweightCategory: 0,
      hasStandards: false,
    };
  }

  // Use MALE standards for OTHER gender
  const effectiveGender = gender === 'OTHER' ? 'MALE' : gender;

  // Find closest bodyweight category
  const bodyweightCategory = findClosestBodyweightCategory(bodyweightKg, effectiveGender);

  // Get standards for this exercise/gender/weight
  const exerciseStandards = STRENGTH_STANDARDS[standardExercise];
  const genderStandards = exerciseStandards?.[effectiveGender];
  const standards = genderStandards?.[bodyweightCategory];

  if (!standards || standards.length !== 5) {
    return {
      level: 'Untrained',
      percentile: 0,
      standardMin: 0,
      standardMax: 0,
      bodyweightCategory,
      hasStandards: false,
    };
  }

  // Standards: [Beginner, Novice, Intermediate, Advanced, Elite]
  const [beginner, novice, intermediate, advanced, elite] = standards;

  // Calculate level and percentile based on where 1RM falls
  if (oneRepMax < beginner) {
    // Untrained: 0-20 percentile
    const percentile = Math.max(0, (oneRepMax / beginner) * 20);
    return {
      level: 'Untrained',
      percentile: Math.round(percentile),
      standardMin: 0,
      standardMax: beginner,
      bodyweightCategory,
      hasStandards: true,
    };
  }

  if (oneRepMax < novice) {
    // Beginner: 20-40 percentile
    const progress = (oneRepMax - beginner) / (novice - beginner);
    const percentile = 20 + progress * 20;
    return {
      level: 'Beginner',
      percentile: Math.round(percentile),
      standardMin: beginner,
      standardMax: novice,
      bodyweightCategory,
      hasStandards: true,
    };
  }

  if (oneRepMax < intermediate) {
    // Novice: 40-60 percentile
    const progress = (oneRepMax - novice) / (intermediate - novice);
    const percentile = 40 + progress * 20;
    return {
      level: 'Novice',
      percentile: Math.round(percentile),
      standardMin: novice,
      standardMax: intermediate,
      bodyweightCategory,
      hasStandards: true,
    };
  }

  if (oneRepMax < advanced) {
    // Intermediate: 60-80 percentile
    const progress = (oneRepMax - intermediate) / (advanced - intermediate);
    const percentile = 60 + progress * 20;
    return {
      level: 'Intermediate',
      percentile: Math.round(percentile),
      standardMin: intermediate,
      standardMax: advanced,
      bodyweightCategory,
      hasStandards: true,
    };
  }

  if (oneRepMax < elite) {
    // Advanced: 80-95 percentile
    const progress = (oneRepMax - advanced) / (elite - advanced);
    const percentile = 80 + progress * 15;
    return {
      level: 'Advanced',
      percentile: Math.round(percentile),
      standardMin: advanced,
      standardMax: elite,
      bodyweightCategory,
      hasStandards: true,
    };
  }

  // Elite: 95-100 percentile
  // Beyond elite, cap at 100 but allow slight increase based on how far beyond
  const beyondElite = (oneRepMax - elite) / elite;
  const percentile = Math.min(100, 95 + beyondElite * 10);

  return {
    level: 'Elite',
    percentile: Math.round(percentile),
    standardMin: elite,
    standardMax: Math.round(elite * 1.2), // Show 20% above elite as max
    bodyweightCategory,
    hasStandards: true,
  };
}

/**
 * Get color for strength level (returns hex color)
 */
export function getStrengthLevelColor(level: StrengthLevel): string {
  const colors: Record<StrengthLevel, string> = {
    Untrained: '#666666', // Gray
    Beginner: '#9CA3AF', // Light gray
    Novice: '#D4AF37', // Gold (primary)
    Intermediate: '#4ADE80', // Green (success)
    Advanced: '#3B82F6', // Blue
    Elite: '#8B5CF6', // Purple
  };
  return colors[level];
}

/**
 * Calculate estimated 1RM from a set
 */
export function calculateEstimated1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;

  // Use Epley formula from performance.ts
  return calculate1RM(weightKg, reps);
}

/**
 * Format weight for display with unit
 */
export function formatWeightWithUnit(
  weightKg: number,
  unit: 'KG' | 'LBS',
  decimals: number = 1
): string {
  if (unit === 'LBS') {
    const lbs = weightKg * 2.20462;
    return `${lbs.toFixed(decimals)}lbs`;
  }
  return `${weightKg.toFixed(decimals)}kg`;
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
export function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Format percentile for display
 */
export function formatPercentile(percentile: number): string {
  return `${getOrdinalSuffix(Math.round(percentile))} percentile`;
}

export interface UserLiftData {
  exerciseName: string;
  standardExercise: string | null;
  best1RM: number;
  bestWeight: number;
  bestReps: number;
  lastPerformed: Date;
}

/**
 * Process workout sets to find best lifts for each exercise
 */
export function processBestLifts(
  sets: Array<{
    exerciseName: string;
    weightKg: number;
    reps: number;
    createdAt: Date;
  }>
): Map<string, UserLiftData> {
  const bestLifts = new Map<string, UserLiftData>();

  for (const set of sets) {
    if (set.weightKg <= 0 || set.reps <= 0) continue;

    const estimated1RM = calculateEstimated1RM(set.weightKg, set.reps);
    const standardExercise = getStandardExercise(set.exerciseName);

    // Only track exercises that have standards
    if (!standardExercise) continue;

    const existing = bestLifts.get(standardExercise);

    if (!existing || estimated1RM > existing.best1RM) {
      bestLifts.set(standardExercise, {
        exerciseName: set.exerciseName,
        standardExercise,
        best1RM: estimated1RM,
        bestWeight: set.weightKg,
        bestReps: set.reps,
        lastPerformed: set.createdAt,
      });
    }
  }

  return bestLifts;
}
