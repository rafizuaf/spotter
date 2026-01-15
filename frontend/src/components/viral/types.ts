/**
 * Viral Sharing Types
 *
 * Shared interfaces for the Viral Engine components.
 * Stats are calculated server-side by the generate-viral-stats Edge Function.
 */

/**
 * Nutrition Label stats from generate-viral-stats Edge Function
 * All calculation logic is LOCKED and server-side only.
 */
export interface NutritionLabelStats {
  /** Total volume moved (weight_kg × reps for all sets) */
  totalVolumeKg: number;
  /** Number of sets completed */
  setsCompleted: number;
  /** Workout duration in minutes */
  durationMinutes: number;
  /** Number of unique exercises performed */
  exercisesCount: number;
  /** Muscle groups worked in this workout */
  muscleGroups: string[];
  /** Number of personal records hit */
  prsHit: number;
  /** XP earned from this workout */
  xpEarned: number;
  /**
   * Pain percentage (0-100)
   * LOCKED FORMULA: min(100, (avgRPE/10)*100 + (failureSets*5))
   */
  painPercent: number;
  /**
   * Estimated sweat in liters
   * LOCKED FORMULA: (durationMins * avgIntensity) / 60
   */
  sweatLiters: number;
  /**
   * Regret percentage (0 or 100)
   * LOCKED FORMULA: 100% if legs skipped, else 0%
   */
  regretPercent: number;
}

/**
 * Monthly archetype stats from generate-viral-stats Edge Function
 */
export interface MonthlyArchetypeStats {
  /** The archetype code */
  archetype:
    | 'VAMPIRE'
    | 'BENCH_LORD'
    | 'SCIENTIST'
    | 'THE_MACHINE'
    | 'THE_GHOST'
    | 'CARDIO_CAPYBARA'
    | 'DEFAULT';
  /** Display title for the archetype */
  title: string;
  /** Unhinged copy for the archetype */
  copy: string;
  /** Statistics that determined this archetype */
  stats: {
    totalWorkouts: number;
    nightWorkouts?: number;
    favoriteTime?: string;
    topMuscleGroup?: string;
    month: string;
  };
}

/**
 * Available viral share card types
 */
export type ViralShareType =
  | 'NUTRITION_LABEL'
  | 'RECEIPT'
  | 'ARCHETYPE'
  | 'WANTED'
  | 'TOMBSTONE'
  | 'RANSOM';

/**
 * Raw API response from generate-viral-stats Edge Function (snake_case)
 * This matches the exact response from the Edge Function.
 */
export interface WorkoutViralStatsApiResponse {
  type: 'WORKOUT';
  workout_id: string;
  workout_name: string;
  workout_date: string;
  nutrition_label: {
    total_volume_kg: number;
    sets_completed: number;
    duration_minutes: number;
    exercises_count: number;
    muscle_groups: string[];
    prs_hit: number;
    xp_earned: number;
    pain_percent: number;
    sweat_liters: number;
    regret_percent: number;
  };
}

/**
 * Transformed response (camelCase) for use in components
 */
export interface WorkoutViralStatsResponse {
  type: 'WORKOUT';
  workoutId: string;
  workoutName: string;
  workoutDate: string;
  nutritionLabel: NutritionLabelStats;
}

/**
 * Response from generate-viral-stats Edge Function (MONTHLY type)
 */
export interface MonthlyViralStatsResponse {
  type: 'MONTHLY';
  archetype: MonthlyArchetypeStats;
}

/**
 * Union type for all viral stats responses
 */
export type ViralStatsResponse =
  | WorkoutViralStatsResponse
  | MonthlyViralStatsResponse;

/**
 * Props for NutritionLabel component
 */
export interface NutritionLabelProps {
  /** Stats to display (from generate-viral-stats) */
  stats: NutritionLabelStats;
  /** Workout name for header */
  workoutName: string;
  /** Workout date */
  date: Date;
}

/**
 * Props for ViralShareModal orchestrator
 */
export interface ViralShareModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Workout ID to generate stats for (required for NUTRITION_LABEL, RECEIPT, TOMBSTONE) */
  workoutId?: string;
  /** Type of viral card to display */
  shareType: ViralShareType;
}
