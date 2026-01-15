/**
 * Viral Sharing Components
 *
 * Export barrel for the Viral Engine components.
 * All components use react-native-view-shot for capture.
 *
 * @see CLAUDE.md → "Phase 2C Components" for full specs
 */

// Components
export { default as NutritionLabel } from './NutritionLabel';
export { default as ViralShareModal } from './ViralShareModal';

// Types
export type {
  NutritionLabelStats,
  NutritionLabelProps,
  ViralShareModalProps,
  ViralShareType,
  MonthlyArchetypeStats,
  WorkoutViralStatsApiResponse,
  WorkoutViralStatsResponse,
  MonthlyViralStatsResponse,
  ViralStatsResponse,
} from './types';
