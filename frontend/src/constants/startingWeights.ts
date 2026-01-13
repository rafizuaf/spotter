/**
 * Starting weight suggestions for beginners
 * Weights are in KG (canonical unit)
 * Based on average beginner capabilities from fitness research
 */

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE';

export interface StartingWeight {
  exerciseName: string;
  maleBeginner: number;
  femaleBeginner: number;
  maleIntermediate: number;
  femaleIntermediate: number;
}

// Starting weights by exercise name (normalized to lowercase for matching)
const STARTING_WEIGHTS: Record<string, StartingWeight> = {
  // Chest
  'bench press (barbell)': {
    exerciseName: 'Bench Press (Barbell)',
    maleBeginner: 20,
    femaleBeginner: 10,
    maleIntermediate: 40,
    femaleIntermediate: 20,
  },
  'bench press (dumbbell)': {
    exerciseName: 'Bench Press (Dumbbell)',
    maleBeginner: 8,
    femaleBeginner: 4,
    maleIntermediate: 16,
    femaleIntermediate: 8,
  },
  'incline bench press (barbell)': {
    exerciseName: 'Incline Bench Press (Barbell)',
    maleBeginner: 15,
    femaleBeginner: 7,
    maleIntermediate: 35,
    femaleIntermediate: 17,
  },
  'incline bench press (dumbbell)': {
    exerciseName: 'Incline Bench Press (Dumbbell)',
    maleBeginner: 6,
    femaleBeginner: 3,
    maleIntermediate: 14,
    femaleIntermediate: 7,
  },
  'chest fly (dumbbell)': {
    exerciseName: 'Chest Fly (Dumbbell)',
    maleBeginner: 6,
    femaleBeginner: 3,
    maleIntermediate: 12,
    femaleIntermediate: 6,
  },
  'chest fly (cable)': {
    exerciseName: 'Chest Fly (Cable)',
    maleBeginner: 5,
    femaleBeginner: 2.5,
    maleIntermediate: 10,
    femaleIntermediate: 5,
  },
  'push-up': {
    exerciseName: 'Push-Up',
    maleBeginner: 0,
    femaleBeginner: 0,
    maleIntermediate: 0,
    femaleIntermediate: 0,
  },
  'dip': {
    exerciseName: 'Dip',
    maleBeginner: 0,
    femaleBeginner: 0,
    maleIntermediate: 10,
    femaleIntermediate: 0,
  },

  // Back
  'deadlift (barbell)': {
    exerciseName: 'Deadlift (Barbell)',
    maleBeginner: 40,
    femaleBeginner: 20,
    maleIntermediate: 80,
    femaleIntermediate: 40,
  },
  'romanian deadlift': {
    exerciseName: 'Romanian Deadlift',
    maleBeginner: 30,
    femaleBeginner: 15,
    maleIntermediate: 60,
    femaleIntermediate: 30,
  },
  'bent over row (barbell)': {
    exerciseName: 'Bent Over Row (Barbell)',
    maleBeginner: 20,
    femaleBeginner: 10,
    maleIntermediate: 40,
    femaleIntermediate: 20,
  },
  'bent over row (dumbbell)': {
    exerciseName: 'Bent Over Row (Dumbbell)',
    maleBeginner: 8,
    femaleBeginner: 4,
    maleIntermediate: 18,
    femaleIntermediate: 9,
  },
  'lat pulldown': {
    exerciseName: 'Lat Pulldown',
    maleBeginner: 25,
    femaleBeginner: 15,
    maleIntermediate: 50,
    femaleIntermediate: 30,
  },
  'seated cable row': {
    exerciseName: 'Seated Cable Row',
    maleBeginner: 20,
    femaleBeginner: 10,
    maleIntermediate: 45,
    femaleIntermediate: 25,
  },
  'pull-up': {
    exerciseName: 'Pull-Up',
    maleBeginner: 0,
    femaleBeginner: 0,
    maleIntermediate: 0,
    femaleIntermediate: 0,
  },
  't-bar row': {
    exerciseName: 'T-Bar Row',
    maleBeginner: 20,
    femaleBeginner: 10,
    maleIntermediate: 40,
    femaleIntermediate: 20,
  },

  // Shoulders
  'overhead press (barbell)': {
    exerciseName: 'Overhead Press (Barbell)',
    maleBeginner: 15,
    femaleBeginner: 7,
    maleIntermediate: 30,
    femaleIntermediate: 15,
  },
  'overhead press (dumbbell)': {
    exerciseName: 'Overhead Press (Dumbbell)',
    maleBeginner: 6,
    femaleBeginner: 3,
    maleIntermediate: 14,
    femaleIntermediate: 7,
  },
  'lateral raise': {
    exerciseName: 'Lateral Raise',
    maleBeginner: 4,
    femaleBeginner: 2,
    maleIntermediate: 8,
    femaleIntermediate: 4,
  },
  'front raise': {
    exerciseName: 'Front Raise',
    maleBeginner: 4,
    femaleBeginner: 2,
    maleIntermediate: 8,
    femaleIntermediate: 4,
  },
  'face pull': {
    exerciseName: 'Face Pull',
    maleBeginner: 10,
    femaleBeginner: 5,
    maleIntermediate: 20,
    femaleIntermediate: 10,
  },
  'reverse fly': {
    exerciseName: 'Reverse Fly',
    maleBeginner: 4,
    femaleBeginner: 2,
    maleIntermediate: 8,
    femaleIntermediate: 4,
  },
  'shrug (barbell)': {
    exerciseName: 'Shrug (Barbell)',
    maleBeginner: 30,
    femaleBeginner: 15,
    maleIntermediate: 60,
    femaleIntermediate: 30,
  },
  'shrug (dumbbell)': {
    exerciseName: 'Shrug (Dumbbell)',
    maleBeginner: 12,
    femaleBeginner: 6,
    maleIntermediate: 25,
    femaleIntermediate: 12,
  },

  // Legs
  'squat (barbell)': {
    exerciseName: 'Squat (Barbell)',
    maleBeginner: 30,
    femaleBeginner: 15,
    maleIntermediate: 60,
    femaleIntermediate: 35,
  },
  'front squat': {
    exerciseName: 'Front Squat',
    maleBeginner: 20,
    femaleBeginner: 10,
    maleIntermediate: 50,
    femaleIntermediate: 25,
  },
  'goblet squat': {
    exerciseName: 'Goblet Squat',
    maleBeginner: 10,
    femaleBeginner: 6,
    maleIntermediate: 20,
    femaleIntermediate: 12,
  },
  'leg press': {
    exerciseName: 'Leg Press',
    maleBeginner: 60,
    femaleBeginner: 40,
    maleIntermediate: 120,
    femaleIntermediate: 80,
  },
  'lunge (dumbbell)': {
    exerciseName: 'Lunge (Dumbbell)',
    maleBeginner: 6,
    femaleBeginner: 4,
    maleIntermediate: 14,
    femaleIntermediate: 8,
  },
  'leg extension': {
    exerciseName: 'Leg Extension',
    maleBeginner: 20,
    femaleBeginner: 10,
    maleIntermediate: 40,
    femaleIntermediate: 25,
  },
  'leg curl': {
    exerciseName: 'Leg Curl',
    maleBeginner: 15,
    femaleBeginner: 8,
    maleIntermediate: 35,
    femaleIntermediate: 20,
  },
  'calf raise (standing)': {
    exerciseName: 'Calf Raise (Standing)',
    maleBeginner: 30,
    femaleBeginner: 20,
    maleIntermediate: 60,
    femaleIntermediate: 40,
  },
  'calf raise (seated)': {
    exerciseName: 'Calf Raise (Seated)',
    maleBeginner: 20,
    femaleBeginner: 10,
    maleIntermediate: 40,
    femaleIntermediate: 25,
  },
  'hip thrust': {
    exerciseName: 'Hip Thrust',
    maleBeginner: 30,
    femaleBeginner: 20,
    maleIntermediate: 60,
    femaleIntermediate: 45,
  },

  // Arms - Biceps
  'bicep curl (barbell)': {
    exerciseName: 'Bicep Curl (Barbell)',
    maleBeginner: 10,
    femaleBeginner: 5,
    maleIntermediate: 20,
    femaleIntermediate: 10,
  },
  'bicep curl (dumbbell)': {
    exerciseName: 'Bicep Curl (Dumbbell)',
    maleBeginner: 5,
    femaleBeginner: 2.5,
    maleIntermediate: 10,
    femaleIntermediate: 5,
  },
  'hammer curl': {
    exerciseName: 'Hammer Curl',
    maleBeginner: 6,
    femaleBeginner: 3,
    maleIntermediate: 12,
    femaleIntermediate: 6,
  },
  'preacher curl': {
    exerciseName: 'Preacher Curl',
    maleBeginner: 8,
    femaleBeginner: 4,
    maleIntermediate: 16,
    femaleIntermediate: 8,
  },
  'concentration curl': {
    exerciseName: 'Concentration Curl',
    maleBeginner: 5,
    femaleBeginner: 2.5,
    maleIntermediate: 10,
    femaleIntermediate: 5,
  },

  // Arms - Triceps
  'tricep pushdown': {
    exerciseName: 'Tricep Pushdown',
    maleBeginner: 15,
    femaleBeginner: 7,
    maleIntermediate: 30,
    femaleIntermediate: 15,
  },
  'overhead tricep extension': {
    exerciseName: 'Overhead Tricep Extension',
    maleBeginner: 8,
    femaleBeginner: 4,
    maleIntermediate: 16,
    femaleIntermediate: 8,
  },
  'skull crusher': {
    exerciseName: 'Skull Crusher',
    maleBeginner: 10,
    femaleBeginner: 5,
    maleIntermediate: 20,
    femaleIntermediate: 10,
  },
  'close grip bench press': {
    exerciseName: 'Close Grip Bench Press',
    maleBeginner: 15,
    femaleBeginner: 7,
    maleIntermediate: 35,
    femaleIntermediate: 17,
  },
  'tricep dip': {
    exerciseName: 'Tricep Dip',
    maleBeginner: 0,
    femaleBeginner: 0,
    maleIntermediate: 0,
    femaleIntermediate: 0,
  },

  // Core
  'plank': {
    exerciseName: 'Plank',
    maleBeginner: 0,
    femaleBeginner: 0,
    maleIntermediate: 0,
    femaleIntermediate: 0,
  },
  'crunch': {
    exerciseName: 'Crunch',
    maleBeginner: 0,
    femaleBeginner: 0,
    maleIntermediate: 0,
    femaleIntermediate: 0,
  },
  'cable crunch': {
    exerciseName: 'Cable Crunch',
    maleBeginner: 15,
    femaleBeginner: 8,
    maleIntermediate: 30,
    femaleIntermediate: 15,
  },
  'hanging leg raise': {
    exerciseName: 'Hanging Leg Raise',
    maleBeginner: 0,
    femaleBeginner: 0,
    maleIntermediate: 0,
    femaleIntermediate: 0,
  },
  'russian twist': {
    exerciseName: 'Russian Twist',
    maleBeginner: 5,
    femaleBeginner: 2.5,
    maleIntermediate: 10,
    femaleIntermediate: 5,
  },
  'ab rollout': {
    exerciseName: 'Ab Rollout',
    maleBeginner: 0,
    femaleBeginner: 0,
    maleIntermediate: 0,
    femaleIntermediate: 0,
  },
};

/**
 * Get suggested starting weight for an exercise
 * @param exerciseName - Name of the exercise
 * @param gender - User's gender
 * @param level - Experience level (defaults to BEGINNER)
 * @returns Suggested weight in KG, or null if no suggestion available
 */
export function getSuggestedWeight(
  exerciseName: string,
  gender: Gender,
  level: ExperienceLevel = 'BEGINNER'
): number | null {
  const normalizedName = exerciseName.toLowerCase().trim();
  const weights = STARTING_WEIGHTS[normalizedName];

  if (!weights) {
    // Try partial match
    const keys = Object.keys(STARTING_WEIGHTS);
    const matchedKey = keys.find(key =>
      normalizedName.includes(key) || key.includes(normalizedName)
    );
    if (!matchedKey) return null;
    return getSuggestedWeightFromData(STARTING_WEIGHTS[matchedKey], gender, level);
  }

  return getSuggestedWeightFromData(weights, gender, level);
}

function getSuggestedWeightFromData(
  weights: StartingWeight,
  gender: Gender,
  level: ExperienceLevel
): number | null {
  // For OTHER gender, use average of male and female
  if (gender === 'OTHER') {
    if (level === 'BEGINNER') {
      return Math.round((weights.maleBeginner + weights.femaleBeginner) / 2);
    }
    return Math.round((weights.maleIntermediate + weights.femaleIntermediate) / 2);
  }

  if (gender === 'MALE') {
    return level === 'BEGINNER' ? weights.maleBeginner : weights.maleIntermediate;
  }

  return level === 'BEGINNER' ? weights.femaleBeginner : weights.femaleIntermediate;
}

/**
 * Check if an exercise has starting weight suggestions
 */
export function hasStartingWeight(exerciseName: string): boolean {
  const normalizedName = exerciseName.toLowerCase().trim();
  if (STARTING_WEIGHTS[normalizedName]) return true;

  // Try partial match
  return Object.keys(STARTING_WEIGHTS).some(key =>
    normalizedName.includes(key) || key.includes(normalizedName)
  );
}

/**
 * Format weight for display with unit
 */
export function formatSuggestedWeight(weightKg: number, unit: 'KG' | 'LBS' = 'KG'): string {
  if (weightKg === 0) return 'Bodyweight';

  if (unit === 'LBS') {
    const lbs = Math.round(weightKg * 2.20462);
    return `${lbs} lbs`;
  }

  return `${weightKg} kg`;
}
