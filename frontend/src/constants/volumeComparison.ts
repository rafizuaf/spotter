/**
 * Volume Comparison Constants
 *
 * Fun, relatable objects for comparing workout volume.
 * Used in viral sharing cards to make stats more engaging.
 *
 * Example: "You lifted 3x a Toyota Corolla!"
 */

export type VolumeCategory = 'ANIMAL' | 'VEHICLE' | 'LANDMARK' | 'FOOD' | 'RANDOM';

export interface VolumeComparison {
  id: string;
  name: string;
  weightKg: number;
  emoji: string;
  funFact: string;
  category: VolumeCategory;
}

/**
 * Collection of fun objects for volume comparisons.
 * Sorted by weight for binary search efficiency.
 */
export const VOLUME_COMPARISONS: VolumeComparison[] = [
  // Tiny (< 10kg)
  {
    id: 'chihuahua',
    name: 'a Chihuahua',
    weightKg: 3,
    emoji: '',
    funFact: "The world's smallest dog breed",
    category: 'ANIMAL',
  },
  {
    id: 'newborn',
    name: 'a Newborn Baby',
    weightKg: 3.5,
    emoji: '',
    funFact: 'Average birth weight',
    category: 'RANDOM',
  },
  {
    id: 'cat',
    name: 'a House Cat',
    weightKg: 5,
    emoji: '',
    funFact: "The internet's favorite animal",
    category: 'ANIMAL',
  },
  {
    id: 'bowling_ball',
    name: 'a Bowling Ball',
    weightKg: 7,
    emoji: '',
    funFact: 'Average tournament ball',
    category: 'RANDOM',
  },
  {
    id: 'watermelon',
    name: 'a Watermelon',
    weightKg: 10,
    emoji: '',
    funFact: '92% water by weight',
    category: 'FOOD',
  },

  // Small (10-100kg)
  {
    id: 'golden_retriever',
    name: 'a Golden Retriever',
    weightKg: 30,
    emoji: '',
    funFact: "Man's best friend",
    category: 'ANIMAL',
  },
  {
    id: 'large_tv',
    name: 'a 75-inch TV',
    weightKg: 40,
    emoji: '',
    funFact: 'Modern home entertainment',
    category: 'RANDOM',
  },
  {
    id: 'adult_human',
    name: 'an Average Human',
    weightKg: 70,
    emoji: '',
    funFact: 'Global adult average',
    category: 'RANDOM',
  },
  {
    id: 'washing_machine',
    name: 'a Washing Machine',
    weightKg: 80,
    emoji: '',
    funFact: 'Front-loader average',
    category: 'RANDOM',
  },

  // Medium (100-500kg)
  {
    id: 'baby_elephant',
    name: 'a Baby Elephant',
    weightKg: 120,
    emoji: '',
    funFact: 'Born after 22 months of pregnancy',
    category: 'ANIMAL',
  },
  {
    id: 'gorilla',
    name: 'a Silverback Gorilla',
    weightKg: 180,
    emoji: '',
    funFact: 'Can lift 10x its body weight',
    category: 'ANIMAL',
  },
  {
    id: 'motorcycle',
    name: 'a Motorcycle',
    weightKg: 200,
    emoji: '',
    funFact: 'Average sport bike',
    category: 'VEHICLE',
  },
  {
    id: 'vending_machine',
    name: 'a Vending Machine',
    weightKg: 350,
    emoji: '',
    funFact: 'Fully stocked',
    category: 'RANDOM',
  },
  {
    id: 'polar_bear',
    name: 'a Polar Bear',
    weightKg: 450,
    emoji: '',
    funFact: 'Largest land carnivore',
    category: 'ANIMAL',
  },
  {
    id: 'grand_piano',
    name: 'a Grand Piano',
    weightKg: 500,
    emoji: '',
    funFact: 'Concert grand weighs ~500kg',
    category: 'RANDOM',
  },

  // Large (500-2000kg)
  {
    id: 'horse',
    name: 'a Horse',
    weightKg: 500,
    emoji: '',
    funFact: 'Average riding horse',
    category: 'ANIMAL',
  },
  {
    id: 'liberty_bell',
    name: 'the Liberty Bell',
    weightKg: 943,
    emoji: '',
    funFact: 'Cracked since 1846',
    category: 'LANDMARK',
  },
  {
    id: 'smart_car',
    name: 'a Smart Car',
    weightKg: 1000,
    emoji: '',
    funFact: 'Ultra-compact vehicle',
    category: 'VEHICLE',
  },
  {
    id: 'toyota_corolla',
    name: 'a Toyota Corolla',
    weightKg: 1300,
    emoji: '',
    funFact: 'Best-selling car ever',
    category: 'VEHICLE',
  },
  {
    id: 'hippo',
    name: 'a Hippopotamus',
    weightKg: 1800,
    emoji: '',
    funFact: 'Most dangerous African animal',
    category: 'ANIMAL',
  },

  // Huge (2000-10000kg)
  {
    id: 'white_rhino',
    name: 'a White Rhino',
    weightKg: 2300,
    emoji: '',
    funFact: 'Second largest land mammal',
    category: 'ANIMAL',
  },
  {
    id: 'ford_f150',
    name: 'a Ford F-150',
    weightKg: 2500,
    emoji: '',
    funFact: "America's best-selling truck",
    category: 'VEHICLE',
  },
  {
    id: 'orca',
    name: 'an Orca',
    weightKg: 5500,
    emoji: '',
    funFact: 'Apex ocean predator',
    category: 'ANIMAL',
  },
  {
    id: 'elephant',
    name: 'an African Elephant',
    weightKg: 6000,
    emoji: '',
    funFact: 'Largest land animal',
    category: 'ANIMAL',
  },
  {
    id: 't_rex',
    name: 'a T-Rex',
    weightKg: 9000,
    emoji: '',
    funFact: 'Estimated adult weight',
    category: 'ANIMAL',
  },

  // Massive (10000kg+)
  {
    id: 'school_bus',
    name: 'a School Bus',
    weightKg: 10900,
    emoji: '',
    funFact: 'Empty weight',
    category: 'VEHICLE',
  },
  {
    id: 'fire_truck',
    name: 'a Fire Truck',
    weightKg: 19000,
    emoji: '',
    funFact: 'Fully loaded',
    category: 'VEHICLE',
  },
  {
    id: 'humpback_whale',
    name: 'a Humpback Whale',
    weightKg: 36000,
    emoji: '',
    funFact: 'Average adult weight',
    category: 'ANIMAL',
  },
  {
    id: 'space_shuttle',
    name: 'a Space Shuttle',
    weightKg: 78000,
    emoji: '',
    funFact: 'Orbiter empty weight',
    category: 'VEHICLE',
  },
  {
    id: 'blue_whale',
    name: 'a Blue Whale',
    weightKg: 150000,
    emoji: '',
    funFact: 'Largest animal ever',
    category: 'ANIMAL',
  },
  {
    id: 'statue_of_liberty',
    name: 'the Statue of Liberty',
    weightKg: 225000,
    emoji: '',
    funFact: 'Copper + steel structure',
    category: 'LANDMARK',
  },
];

// Pre-sort by weight descending for efficient lookup
const SORTED_COMPARISONS = [...VOLUME_COMPARISONS].sort((a, b) => b.weightKg - a.weightKg);

/**
 * Result of a volume comparison lookup
 */
export interface VolumeComparisonResult {
  comparison: VolumeComparison;
  multiple: number;
  displayText: string;
  displayTextShort: string;
}

/**
 * Find the best volume comparison for a given weight.
 * Returns the largest object that the volume exceeds.
 *
 * @param volumeKg - Total volume in kilograms
 * @returns Comparison result with display text
 */
export function getVolumeComparison(volumeKg: number): VolumeComparisonResult | null {
  if (volumeKg <= 0) {
    return null;
  }

  // Find largest object that volume exceeds
  for (const item of SORTED_COMPARISONS) {
    if (volumeKg >= item.weightKg) {
      const multiple = Math.round((volumeKg / item.weightKg) * 10) / 10;
      const multipleText = multiple >= 2 ? `${Math.floor(multiple)}x ` : '';

      return {
        comparison: item,
        multiple,
        displayText: `You lifted ${multipleText}${item.name} ${item.emoji}`,
        displayTextShort: `${multipleText}${item.name}`,
      };
    }
  }

  // Volume too small - use smallest item with fraction
  const smallest = SORTED_COMPARISONS[SORTED_COMPARISONS.length - 1];
  const fraction = Math.round((volumeKg / smallest.weightKg) * 100);

  return {
    comparison: smallest,
    multiple: volumeKg / smallest.weightKg,
    displayText: `You lifted ${fraction}% of ${smallest.name} ${smallest.emoji}`,
    displayTextShort: `${fraction}% of ${smallest.name}`,
  };
}

/**
 * Get viral-ready comparison text for sharing.
 * Uses Industrial Luxury voice - confident, slightly unhinged.
 *
 * @param volumeKg - Total volume in kilograms
 * @returns Shareable text string
 */
export function getViralVolumeComparison(volumeKg: number): string {
  const result = getVolumeComparison(volumeKg);
  if (!result) {
    return `${volumeKg.toLocaleString()}kg lifted`;
  }

  return result.displayText;
}

/**
 * Get comparison for a specific category (for variety in UI).
 *
 * @param volumeKg - Total volume in kilograms
 * @param preferredCategory - Category to prefer if available
 * @returns Comparison result or null
 */
export function getVolumeComparisonByCategory(
  volumeKg: number,
  preferredCategory: VolumeCategory
): VolumeComparisonResult | null {
  if (volumeKg <= 0) {
    return null;
  }

  // Filter by category
  const categoryItems = SORTED_COMPARISONS.filter((item) => item.category === preferredCategory);

  for (const item of categoryItems) {
    if (volumeKg >= item.weightKg) {
      const multiple = Math.round((volumeKg / item.weightKg) * 10) / 10;
      const multipleText = multiple >= 2 ? `${Math.floor(multiple)}x ` : '';

      return {
        comparison: item,
        multiple,
        displayText: `You lifted ${multipleText}${item.name} ${item.emoji}`,
        displayTextShort: `${multipleText}${item.name}`,
      };
    }
  }

  // Fallback to any category
  return getVolumeComparison(volumeKg);
}

/**
 * Format volume with appropriate unit and comparison.
 *
 * @param volumeKg - Volume in kilograms
 * @param unit - Display unit preference
 * @returns Formatted string with comparison
 */
export function formatVolumeWithComparison(
  volumeKg: number,
  unit: 'KG' | 'LBS' = 'KG'
): { volume: string; comparison: string | null } {
  const displayVolume = unit === 'LBS' ? volumeKg * 2.20462 : volumeKg;
  const unitLabel = unit.toLowerCase();
  const formattedVolume = `${Math.round(displayVolume).toLocaleString()}${unitLabel}`;

  const result = getVolumeComparison(volumeKg);

  return {
    volume: formattedVolume,
    comparison: result?.displayTextShort ?? null,
  };
}
