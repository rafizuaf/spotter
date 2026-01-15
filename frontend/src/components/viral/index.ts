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
export { default as ReceiptCard } from './ReceiptCard';
export { default as AstrologyCard } from './AstrologyCard';
export { default as WantedPoster } from './WantedPoster';
export { default as Tombstone } from './Tombstone';
export { default as RansomNote } from './RansomNote';
export { default as FraudAlert } from './FraudAlert';
export { default as ViralShareModal } from './ViralShareModal';

// Types
export type {
  // Nutrition Label
  NutritionLabelStats,
  NutritionLabelProps,
  // Receipt Card
  ReceiptItem,
  ReceiptCardProps,
  PainLevel,
  // Astrology Card
  AstrologyCardProps,
  // Re-engagement Cards
  ReEngagementCardType,
  ReEngagementData,
  WantedPosterProps,
  TombstoneProps,
  RansomNoteProps,
  FraudAlertProps,
  ReEngagementApiResponse,
  // Modal
  ViralShareModalProps,
  ViralShareType,
  // API Responses
  MonthlyArchetypeStats,
  WorkoutViralStatsApiResponse,
  WorkoutViralStatsResponse,
  MonthlyViralStatsResponse,
  ViralStatsResponse,
} from './types';
