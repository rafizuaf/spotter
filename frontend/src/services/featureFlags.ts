/**
 * Feature Flags Service
 * 
 * B10: Client-side feature flag checking with rollout percentages and tier targeting
 * Flags are synced from server (read-only) and checked locally for performance
 */

import { database, featureFlagsCollection } from '../db';
import { Q } from '@nozbe/watermelondb';
import type FeatureFlag from '../db/models/FeatureFlag';
import { useAuthStore } from '../stores/authStore';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { logger } from '../utils/logger';

/**
 * Simple hash function for consistent rollout percentage calculation
 * B10: Deterministic hash based on userId + flagKey for consistent rollout
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Parse target_tiers JSON string to array
 */
function parseTargetTiers(targetTiersJson: string): string[] {
  try {
    if (!targetTiersJson || targetTiersJson === '[]') {
      return [];
    }
    return JSON.parse(targetTiersJson) as string[];
  } catch (error) {
    logger.warn('Failed to parse target_tiers', { targetTiersJson, error });
    return [];
  }
}

/**
 * Check if a feature flag is enabled for a user
 * 
 * @param flagKey - The feature flag key (e.g., 'viral_share')
 * @param userId - User ID for rollout percentage calculation
 * @param userTier - User's subscription tier ('FREE' | 'PRO' | 'ELITE')
 * @returns Promise<boolean> - true if feature is enabled for this user
 */
export async function isFeatureEnabled(
  flagKey: string,
  userId: string,
  userTier: 'FREE' | 'PRO' | 'ELITE'
): Promise<boolean> {
  try {
    const flag = await featureFlagsCollection
      .query(Q.where('flag_key', flagKey))
      .fetch();

    if (flag.length === 0) {
      // Flag not found - default to disabled
      logger.debug('Feature flag not found', { flagKey });
      return false;
    }

    const featureFlag = flag[0];

    // Check if flag is globally enabled
    if (!featureFlag.enabled) {
      return false;
    }

    // Check tier targeting
    const targetTiers = parseTargetTiers(featureFlag.targetTiers);
    if (targetTiers.length > 0 && !targetTiers.includes(userTier)) {
      // Flag is targeted to specific tiers, and user's tier is not included
      return false;
    }

    // Check rollout percentage
    if (featureFlag.rolloutPercent < 100) {
      // Calculate hash based on userId + flagKey for consistent assignment
      const hash = simpleHash(userId + flagKey) % 100;
      const isInRollout = hash < featureFlag.rolloutPercent;
      
      logger.debug('Feature flag rollout check', {
        flagKey,
        rolloutPercent: featureFlag.rolloutPercent,
        hash,
        isInRollout,
      });
      
      return isInRollout;
    }

    // 100% rollout - enabled for all users (matching tier if specified)
    return true;
  } catch (error) {
    logger.error('Error checking feature flag', error, { flagKey, userId, userTier });
    // On error, default to disabled (fail-safe)
    return false;
  }
}

/**
 * React hook to check if a feature flag is enabled
 * 
 * @param flagKey - The feature flag key
 * @returns boolean - true if feature is enabled for current user
 */
export function useFeatureFlag(flagKey: string): boolean {
  const { user } = useAuthStore();
  const { tier } = useSubscriptionStore();
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    if (!user?.id) {
      setEnabled(false);
      return;
    }

    isFeatureEnabled(flagKey, user.id, tier).then(setEnabled).catch((error) => {
      logger.error('Error in useFeatureFlag', error, { flagKey });
      setEnabled(false);
    });
  }, [flagKey, user?.id, tier]);

  return enabled;
}

// Fix: Import React for hooks
import React from 'react';
