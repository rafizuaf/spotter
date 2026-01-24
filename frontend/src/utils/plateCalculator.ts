/**
 * Plate Calculator Utility
 *
 * Calculates what plates to load on a barbell for a target weight.
 * Supports both metric (KG) and imperial (LBS) units.
 */

// Standard plate sizes in KG (IWF standard)
export const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

// Standard plate sizes in LBS
export const LBS_PLATES = [45, 35, 25, 15, 10, 5, 2.5];

// Standard barbell weights
export const KG_BARBELL = 20; // Olympic barbell
export const LBS_BARBELL = 45; // Olympic barbell in LBS

// IWF standard plate colors (for KG)
export const PLATE_COLORS_KG: Record<number, string> = {
  25: '#E53935', // Red
  20: '#1E88E5', // Blue
  15: '#FDD835', // Yellow
  10: '#43A047', // Green
  5: '#FAFAFA', // White
  2.5: '#E53935', // Red (small)
  1.25: '#9E9E9E', // Chrome/Gray
};

// Plate colors for LBS
export const PLATE_COLORS_LBS: Record<number, string> = {
  45: '#1E88E5', // Blue
  35: '#FDD835', // Yellow
  25: '#43A047', // Green
  15: '#FAFAFA', // White
  10: '#FAFAFA', // White
  5: '#9E9E9E', // Gray
  2.5: '#9E9E9E', // Gray
};

export interface PlateResult {
  /** Plates needed per side (array of weights) */
  platesPerSide: number[];
  /** Total weight of all plates (both sides) */
  totalPlateWeight: number;
  /** The weight that can actually be achieved */
  achievedWeight: number;
  /** Weight that couldn't be loaded (if any) */
  remainder: number;
  /** Whether the exact target was achieved */
  isExact: boolean;
  /** Error message if calculation failed */
  error?: string;
}

/**
 * Calculate plates needed per side for a target weight
 *
 * @param targetWeight - The total weight to achieve
 * @param barbellWeight - Weight of the barbell
 * @param availablePlates - Array of available plate sizes (largest first recommended)
 * @returns PlateResult with plates per side and calculation details
 */
export function calculatePlates(
  targetWeight: number,
  barbellWeight: number,
  availablePlates: number[]
): PlateResult {
  const weightToLoad = targetWeight - barbellWeight;

  // Handle edge cases
  if (targetWeight <= 0) {
    return {
      platesPerSide: [],
      totalPlateWeight: 0,
      achievedWeight: 0,
      remainder: 0,
      isExact: false,
      error: 'Target weight must be greater than 0',
    };
  }

  if (weightToLoad < 0) {
    return {
      platesPerSide: [],
      totalPlateWeight: 0,
      achievedWeight: barbellWeight,
      remainder: 0,
      isExact: false,
      error: `Target weight (${targetWeight}) is less than barbell (${barbellWeight})`,
    };
  }

  if (weightToLoad === 0) {
    return {
      platesPerSide: [],
      totalPlateWeight: 0,
      achievedWeight: barbellWeight,
      remainder: 0,
      isExact: true,
    };
  }

  // Weight must be divisible by 2 (equal on both sides)
  const perSide = weightToLoad / 2;
  const platesPerSide: number[] = [];
  let remaining = perSide;

  // Sort plates from largest to smallest (greedy algorithm)
  const sortedPlates = [...availablePlates].sort((a, b) => b - a);

  // Use largest plates first
  for (const plate of sortedPlates) {
    while (remaining >= plate - 0.001) { // Small epsilon for floating point
      platesPerSide.push(plate);
      remaining -= plate;
      remaining = Math.round(remaining * 1000) / 1000; // Fix floating point errors
    }
  }

  const totalPlateWeight = (perSide - remaining) * 2;
  const achievedWeight = barbellWeight + totalPlateWeight;
  const totalRemainder = remaining * 2;

  return {
    platesPerSide,
    totalPlateWeight,
    achievedWeight,
    remainder: Math.round(totalRemainder * 100) / 100,
    isExact: totalRemainder < 0.01,
  };
}

/**
 * Get the color for a plate based on weight and unit
 */
export function getPlateColor(weight: number, unit: 'KG' | 'LBS'): string {
  const colors = unit === 'KG' ? PLATE_COLORS_KG : PLATE_COLORS_LBS;
  return colors[weight] || '#9E9E9E'; // Default to gray
}

/**
 * Format plates list as human-readable string
 *
 * @param plates - Array of plate weights
 * @param unit - Weight unit (KG or LBS)
 * @returns Formatted string like "20 + 10 + 5 = 35kg"
 */
export function formatPlateList(plates: number[], unit: 'KG' | 'LBS'): string {
  if (plates.length === 0) {
    return 'No plates needed';
  }

  const sum = plates.reduce((acc, p) => acc + p, 0);
  const unitLabel = unit.toLowerCase();
  const plateStr = plates.map((p) => `${p}`).join(' + ');

  return `${plateStr} = ${sum}${unitLabel}`;
}

/**
 * Get plates array for a given unit
 */
export function getAvailablePlates(unit: 'KG' | 'LBS'): number[] {
  return unit === 'KG' ? KG_PLATES : LBS_PLATES;
}

/**
 * Get standard barbell weight for a given unit
 */
export function getBarbellWeight(unit: 'KG' | 'LBS'): number {
  return unit === 'KG' ? KG_BARBELL : LBS_BARBELL;
}

/**
 * Calculate plates for a target weight with default settings
 *
 * @param targetWeight - Target total weight
 * @param unit - Weight unit (KG or LBS)
 * @returns PlateResult
 */
export function calculatePlatesForWeight(
  targetWeight: number,
  unit: 'KG' | 'LBS'
): PlateResult {
  const barbellWeight = getBarbellWeight(unit);
  const availablePlates = getAvailablePlates(unit);
  return calculatePlates(targetWeight, barbellWeight, availablePlates);
}

/**
 * Group consecutive identical plates for display
 *
 * @param plates - Array of plate weights
 * @returns Array of {weight, count} objects
 */
export function groupPlates(plates: number[]): Array<{ weight: number; count: number }> {
  if (plates.length === 0) return [];

  const groups: Array<{ weight: number; count: number }> = [];
  let currentWeight = plates[0];
  let currentCount = 1;

  for (let i = 1; i < plates.length; i++) {
    if (plates[i] === currentWeight) {
      currentCount++;
    } else {
      groups.push({ weight: currentWeight, count: currentCount });
      currentWeight = plates[i];
      currentCount = 1;
    }
  }

  groups.push({ weight: currentWeight, count: currentCount });
  return groups;
}

/**
 * Get plate height multiplier for visual display
 * Heavier plates are taller
 */
export function getPlateHeightMultiplier(weight: number, unit: 'KG' | 'LBS'): number {
  if (unit === 'KG') {
    if (weight >= 25) return 1.0;
    if (weight >= 20) return 0.95;
    if (weight >= 15) return 0.85;
    if (weight >= 10) return 0.75;
    if (weight >= 5) return 0.6;
    return 0.45;
  } else {
    if (weight >= 45) return 1.0;
    if (weight >= 35) return 0.9;
    if (weight >= 25) return 0.8;
    if (weight >= 15) return 0.65;
    if (weight >= 10) return 0.55;
    return 0.45;
  }
}

/**
 * Get plate width multiplier for visual display
 * Heavier plates are thicker
 */
export function getPlateWidthMultiplier(weight: number, unit: 'KG' | 'LBS'): number {
  if (unit === 'KG') {
    if (weight >= 25) return 1.0;
    if (weight >= 20) return 0.85;
    if (weight >= 15) return 0.7;
    if (weight >= 10) return 0.55;
    if (weight >= 5) return 0.4;
    return 0.3;
  } else {
    if (weight >= 45) return 1.0;
    if (weight >= 35) return 0.8;
    if (weight >= 25) return 0.65;
    if (weight >= 15) return 0.5;
    if (weight >= 10) return 0.4;
    return 0.3;
  }
}
