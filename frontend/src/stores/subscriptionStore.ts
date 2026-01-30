import { create } from 'zustand';
import { Q } from '@nozbe/watermelondb';
import { userEntitlementsCollection } from '../db';
import { syncDatabase } from '../db/sync';
import { purchasePackage, restorePurchases, type PurchasesPackage } from '../services/purchases';
import { logError } from '../utils/errorHandler';
import type UserEntitlement from '../db/models/UserEntitlement';

export type SubscriptionTier = 'FREE' | 'PRO' | 'ELITE';

interface SubscriptionState {
  tier: SubscriptionTier;
  isTrial: boolean;
  trialEndsAt: Date | null;
  validUntil: Date | null;
  source: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: (userId: string) => Promise<void>;
  refresh: (userId: string) => Promise<void>;
  reset: () => void;
  purchase: (pkg: PurchasesPackage, userId: string) => Promise<{ success: boolean; error?: string }>;
  restore: (userId: string) => Promise<{ success: boolean; error?: string }>;

  // Helpers
  canAccess: (requiredTier: SubscriptionTier) => boolean;
  isExpired: () => boolean;
  isTrialActive: () => boolean;
  daysUntilExpiry: () => number | null;
}

/**
 * Subscription Store
 *
 * Manages the user's subscription state from the local WatermelonDB cache.
 * The user_entitlements table is READ-ONLY (synced from server via pull-only).
 *
 * SECURITY: This data comes from the server-controlled user_entitlements table,
 * which can only be modified by the payment-webhook edge function.
 */
export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: 'FREE',
  isTrial: false,
  trialEndsAt: null,
  validUntil: null,
  source: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      await get().refresh(userId);
      set({ isInitialized: true });
    } catch (error) {
      logError(error, 'subscriptionStore_initialize');
      set({
        isLoading: false,
        isInitialized: true,
        error: 'Failed to load subscription',
      });
    }
  },

  refresh: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });

      // Fetch from local WatermelonDB (synced from server)
      const entitlements = await userEntitlementsCollection
        .query(Q.where('user_id', userId))
        .fetch();

      const entitlement = entitlements[0] as UserEntitlement | undefined;

      if (!entitlement) {
        // No entitlement record - user is FREE
        set({
          tier: 'FREE',
          isTrial: false,
          trialEndsAt: null,
          validUntil: null,
          source: null,
          isLoading: false,
        });
        return;
      }

      // Check expiry status
      const now = new Date();
      const validUntil = entitlement.validUntil;
      const trialEndsAt = entitlement.trialEndsAt;

      // Determine effective tier
      let effectiveTier: SubscriptionTier = 'FREE';
      const tierRaw = entitlement.tier.toUpperCase();

      if (tierRaw === 'PRO' || tierRaw === 'ELITE') {
        // Check if subscription is still valid
        const isValid = !validUntil || now < new Date(validUntil);
        const isTrialValid = !entitlement.isTrial || !trialEndsAt || now < new Date(trialEndsAt);

        if (isValid && isTrialValid) {
          effectiveTier = tierRaw;
        }
      }

      set({
        tier: effectiveTier,
        isTrial: entitlement.isTrial,
        trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        source: entitlement.source,
        isLoading: false,
      });
    } catch (error) {
      logError(error, 'subscriptionStore_refresh');
      set({
        isLoading: false,
        error: 'Failed to refresh subscription',
      });
    }
  },

  reset: () => {
    set({
      tier: 'FREE',
      isTrial: false,
      trialEndsAt: null,
      validUntil: null,
      source: null,
      isLoading: false,
      isInitialized: false,
      error: null,
    });
  },

  purchase: async (pkg: PurchasesPackage, userId: string) => {
    try {
      set({ isLoading: true, error: null });

      const result = await purchasePackage(pkg);

      if ('error' in result) {
        set({ isLoading: false, error: result.error });
        return { success: false, error: result.error };
      }

      // Purchase successful - sync database to get updated entitlement
      await syncDatabase();

      // Refresh subscription state
      await get().refresh(userId);

      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Purchase failed';
      logError(error, 'subscriptionStore_purchase');
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  restore: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });

      const customerInfo = await restorePurchases();

      if (!customerInfo) {
        set({ isLoading: false, error: 'No purchases found to restore' });
        return { success: false, error: 'No purchases found to restore' };
      }

      // Restore successful - sync database to get updated entitlement
      await syncDatabase();

      // Refresh subscription state
      await get().refresh(userId);

      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Restore failed';
      logError(error, 'subscriptionStore_restore');
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  canAccess: (requiredTier: SubscriptionTier) => {
    const tierOrder: Record<SubscriptionTier, number> = {
      FREE: 0,
      PRO: 1,
      ELITE: 2,
    };
    const currentTier = get().tier;
    return tierOrder[currentTier] >= tierOrder[requiredTier];
  },

  isExpired: () => {
    const { validUntil, isTrial, trialEndsAt } = get();

    if (isTrial && trialEndsAt) {
      return new Date() >= trialEndsAt;
    }

    if (validUntil) {
      return new Date() >= validUntil;
    }

    // No expiry date means lifetime or FREE
    return false;
  },

  isTrialActive: () => {
    const { isTrial, trialEndsAt } = get();
    if (!isTrial || !trialEndsAt) return false;
    return new Date() < trialEndsAt;
  },

  daysUntilExpiry: () => {
    const { validUntil, isTrial, trialEndsAt } = get();

    const expiryDate = isTrial && trialEndsAt ? trialEndsAt : validUntil;

    if (!expiryDate) return null;

    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  },
}));

/**
 * Hook to check if user can access a specific tier
 * Usage: const canAccessPro = useCanAccessTier('PRO');
 */
export function useCanAccessTier(requiredTier: SubscriptionTier): boolean {
  return useSubscriptionStore((state) => state.canAccess(requiredTier));
}

/**
 * Hook to get the current tier
 * Usage: const tier = useCurrentTier();
 */
export function useCurrentTier(): SubscriptionTier {
  return useSubscriptionStore((state) => state.tier);
}

/**
 * Tier feature limits
 */
export const TIER_LIMITS = {
  FREE: {
    maxRoutines: 3,
    maxCustomExercises: 7,
    historyDays: 7,
    canExportCsv: true, // 1x per month
    canExportJson: false,
    canExportPdf: false,
    hasTrainingMax: false,
    hasAdvancedPrograms: false,
    hasWeeklyVolumeReport: false,
  },
  PRO: {
    maxRoutines: 10,
    maxCustomExercises: 50,
    historyDays: Infinity,
    canExportCsv: true, // Unlimited
    canExportJson: true,
    canExportPdf: false,
    hasTrainingMax: false,
    hasAdvancedPrograms: false,
    hasWeeklyVolumeReport: true,
  },
  ELITE: {
    maxRoutines: Infinity,
    maxCustomExercises: Infinity,
    historyDays: Infinity,
    canExportCsv: true,
    canExportJson: true,
    canExportPdf: true,
    hasTrainingMax: true,
    hasAdvancedPrograms: true,
    hasWeeklyVolumeReport: true,
  },
} as const;

export default useSubscriptionStore;
