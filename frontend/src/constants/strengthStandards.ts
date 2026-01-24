/**
 * Strength Standards Constants
 *
 * Population-based strength benchmarks for comparing user lifts.
 * Based on ExRx.net and StrengthLevel.net standards.
 *
 * Standards represent 1RM (one-rep max) in KG for each level:
 * [Beginner, Novice, Intermediate, Advanced, Elite]
 */

// Bodyweight categories in kg
export const BODYWEIGHT_CATEGORIES_MALE = [60, 67.5, 75, 82.5, 90, 100, 110, 125, 145];
export const BODYWEIGHT_CATEGORIES_FEMALE = [47.5, 52, 56, 60, 67.5, 75, 82.5, 90];

// Strength level definitions
export type StrengthLevel =
  | 'Untrained'
  | 'Beginner'
  | 'Novice'
  | 'Intermediate'
  | 'Advanced'
  | 'Elite';

export interface StrengthLevelInfo {
  level: StrengthLevel;
  description: string;
  percentileRange: [number, number];
}

export const STRENGTH_LEVELS: StrengthLevelInfo[] = [
  { level: 'Untrained', description: 'No training experience', percentileRange: [0, 20] },
  { level: 'Beginner', description: '1-6 months training', percentileRange: [20, 40] },
  { level: 'Novice', description: '6-12 months training', percentileRange: [40, 60] },
  { level: 'Intermediate', description: '1-2 years training', percentileRange: [60, 80] },
  { level: 'Advanced', description: '2-5 years training', percentileRange: [80, 95] },
  { level: 'Elite', description: '5+ years, competitive', percentileRange: [95, 100] },
];

// Standards format: [Beginner, Novice, Intermediate, Advanced, Elite] in kg
type GenderStandards = Record<number, number[]>;
type ExerciseStandards = {
  MALE: GenderStandards;
  FEMALE: GenderStandards;
};

/**
 * Strength standards by exercise, gender, and bodyweight.
 * Values are 1RM in kg for each level threshold.
 */
export const STRENGTH_STANDARDS: Record<string, ExerciseStandards> = {
  'Bench Press': {
    MALE: {
      60: [35, 50, 70, 90, 115],
      67.5: [40, 55, 80, 100, 130],
      75: [45, 60, 85, 110, 140],
      82.5: [50, 70, 95, 120, 155],
      90: [55, 75, 105, 130, 165],
      100: [60, 80, 110, 140, 180],
      110: [65, 85, 120, 150, 190],
      125: [70, 95, 130, 160, 200],
      145: [75, 100, 140, 175, 220],
    },
    FEMALE: {
      47.5: [12, 20, 30, 42, 55],
      52: [15, 25, 35, 50, 65],
      56: [18, 28, 40, 55, 70],
      60: [20, 30, 45, 60, 80],
      67.5: [25, 35, 50, 70, 90],
      75: [28, 40, 55, 75, 100],
      82.5: [30, 45, 60, 80, 105],
      90: [32, 48, 65, 85, 110],
    },
  },
  'Squat': {
    MALE: {
      60: [50, 70, 95, 125, 160],
      67.5: [55, 80, 105, 140, 180],
      75: [60, 85, 115, 150, 195],
      82.5: [70, 95, 130, 165, 210],
      90: [75, 105, 140, 180, 230],
      100: [80, 110, 150, 195, 250],
      110: [85, 120, 160, 210, 270],
      125: [95, 130, 175, 225, 290],
      145: [100, 140, 190, 245, 315],
    },
    FEMALE: {
      47.5: [25, 40, 55, 75, 100],
      52: [30, 45, 60, 85, 110],
      56: [35, 50, 70, 95, 120],
      60: [38, 55, 75, 100, 130],
      67.5: [45, 65, 85, 115, 150],
      75: [50, 70, 95, 125, 165],
      82.5: [55, 75, 105, 135, 175],
      90: [60, 82, 110, 145, 185],
    },
  },
  'Deadlift': {
    MALE: {
      60: [60, 85, 115, 150, 190],
      67.5: [70, 95, 130, 170, 215],
      75: [75, 105, 140, 185, 235],
      82.5: [85, 115, 155, 200, 255],
      90: [90, 125, 170, 220, 280],
      100: [100, 140, 185, 240, 305],
      110: [110, 150, 200, 260, 330],
      125: [120, 165, 220, 285, 360],
      145: [130, 180, 240, 310, 395],
    },
    FEMALE: {
      47.5: [35, 50, 70, 95, 125],
      52: [40, 58, 80, 105, 140],
      56: [45, 65, 90, 115, 150],
      60: [50, 70, 95, 125, 165],
      67.5: [55, 80, 110, 145, 190],
      75: [62, 90, 120, 160, 205],
      82.5: [68, 97, 130, 170, 220],
      90: [75, 105, 140, 180, 235],
    },
  },
  'Overhead Press': {
    MALE: {
      60: [20, 32, 45, 60, 78],
      67.5: [25, 38, 52, 70, 90],
      75: [28, 42, 58, 78, 100],
      82.5: [32, 48, 65, 85, 110],
      90: [35, 52, 72, 95, 120],
      100: [38, 58, 80, 105, 135],
      110: [42, 62, 87, 115, 145],
      125: [45, 68, 95, 125, 160],
      145: [50, 75, 105, 138, 175],
    },
    FEMALE: {
      47.5: [10, 16, 24, 33, 43],
      52: [12, 20, 28, 38, 50],
      56: [14, 22, 32, 43, 56],
      60: [15, 25, 35, 48, 62],
      67.5: [18, 28, 40, 55, 72],
      75: [20, 32, 45, 60, 80],
      82.5: [22, 35, 48, 65, 85],
      90: [24, 38, 52, 70, 92],
    },
  },
  'Barbell Row': {
    MALE: {
      60: [30, 45, 62, 82, 105],
      67.5: [35, 52, 72, 95, 122],
      75: [40, 58, 80, 105, 135],
      82.5: [45, 65, 90, 118, 150],
      90: [50, 72, 98, 128, 165],
      100: [55, 80, 108, 142, 182],
      110: [60, 87, 118, 155, 198],
      125: [68, 95, 130, 170, 218],
      145: [75, 105, 142, 185, 238],
    },
    FEMALE: {
      47.5: [15, 25, 35, 48, 62],
      52: [18, 28, 40, 55, 72],
      56: [22, 33, 46, 62, 82],
      60: [25, 37, 52, 70, 92],
      67.5: [28, 42, 60, 80, 105],
      75: [32, 48, 68, 90, 118],
      82.5: [35, 53, 75, 98, 128],
      90: [38, 58, 82, 108, 140],
    },
  },
};

/**
 * Map common exercise name variations to standard categories
 */
export const EXERCISE_NAME_MAPPING: Record<string, string> = {
  // Bench Press variations
  'Barbell Bench Press': 'Bench Press',
  'Flat Bench Press': 'Bench Press',
  'Bench Press (Barbell)': 'Bench Press',
  'Flat Barbell Bench Press': 'Bench Press',

  // Squat variations
  'Barbell Back Squat': 'Squat',
  'Back Squat': 'Squat',
  'Barbell Squat': 'Squat',
  'Squat (Barbell)': 'Squat',
  'Low Bar Squat': 'Squat',
  'High Bar Squat': 'Squat',

  // Deadlift variations
  'Conventional Deadlift': 'Deadlift',
  'Barbell Deadlift': 'Deadlift',
  'Deadlift (Barbell)': 'Deadlift',

  // Overhead Press variations
  'Standing Overhead Press': 'Overhead Press',
  'Barbell Overhead Press': 'Overhead Press',
  'Military Press': 'Overhead Press',
  'Shoulder Press (Barbell)': 'Overhead Press',
  'Standing Barbell Press': 'Overhead Press',
  'OHP': 'Overhead Press',

  // Barbell Row variations
  'Bent Over Barbell Row': 'Barbell Row',
  'Bent Over Row': 'Barbell Row',
  'Barbell Bent Over Row': 'Barbell Row',
  'Pendlay Row': 'Barbell Row',
  'BB Row': 'Barbell Row',
};

/**
 * Get the standard exercise category for a given exercise name
 */
export function getStandardExercise(exerciseName: string): string | null {
  // Check if it's already a standard name
  if (STRENGTH_STANDARDS[exerciseName]) {
    return exerciseName;
  }

  // Check mapping
  const mapped = EXERCISE_NAME_MAPPING[exerciseName];
  if (mapped && STRENGTH_STANDARDS[mapped]) {
    return mapped;
  }

  // Case-insensitive search
  const lowerName = exerciseName.toLowerCase();
  for (const [variant, standard] of Object.entries(EXERCISE_NAME_MAPPING)) {
    if (variant.toLowerCase() === lowerName) {
      return standard;
    }
  }

  // Check if exercise name contains a standard name
  for (const standard of Object.keys(STRENGTH_STANDARDS)) {
    if (lowerName.includes(standard.toLowerCase())) {
      return standard;
    }
  }

  return null;
}

/**
 * Get list of supported exercises for strength standards
 */
export function getSupportedExercises(): string[] {
  return Object.keys(STRENGTH_STANDARDS);
}
