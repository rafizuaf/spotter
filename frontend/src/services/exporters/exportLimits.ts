/**
 * Phase 2D: Tier resolution and export limits (Free 1x/month CSV, Pro/Elite).
 * 
 * SECURITY: Uses user_entitlements table (read-only, server-controlled)
 * instead of users.subscription_tier (user-editable).
 */

import * as SecureStore from 'expo-secure-store';
import { Q } from '@nozbe/watermelondb';
import { userEntitlementsCollection } from '../../db';
import type UserEntitlement from '../../db/models/UserEntitlement';

const LAST_EXPORT_KEY = 'spotter_last_export_at';

export type ExportTier = 'FREE' | 'PRO' | 'ELITE';

export interface CanExportResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Resolve tier from user_entitlements table (secure, server-controlled).
 * Defaults to FREE if no entitlement found or expired.
 * 
 * @param userId - Supabase user ID (server_id)
 */
export async function getTier(userId: string): Promise<ExportTier> {
  const entitlements = await userEntitlementsCollection
    .query(Q.where('user_id', userId))
    .fetch();

  const entitlement = entitlements[0] as UserEntitlement | undefined;
  if (!entitlement) {
    return 'FREE';
  }

  // Check expiry
  const now = new Date();
  if (entitlement.validUntil && now >= new Date(entitlement.validUntil)) {
    return 'FREE';
  }

  const tier = entitlement.tier.toUpperCase();
  return (tier === 'PRO' || tier === 'ELITE') ? tier : 'FREE';
}

export async function getLastExportAt(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(LAST_EXPORT_KEY);
  } catch {
    return null;
  }
}

export async function setLastExportAt(iso: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(LAST_EXPORT_KEY, iso);
  } catch (e) {
    console.warn('[exportLimits] Failed to persist last export:', e);
  }
}

/** Free: 1x per calendar month. */
export function canExportCsv(
  tier: ExportTier,
  lastExportAt: string | null
): CanExportResult {
  if (tier === 'PRO' || tier === 'ELITE') {
    return { allowed: true };
  }
  if (!lastExportAt) {
    return { allowed: true };
  }
  const last = new Date(lastExportAt);
  const now = new Date();
  if (last.getUTCFullYear() !== now.getUTCFullYear() || last.getUTCMonth() !== now.getUTCMonth()) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: 'Free users can export CSV once per month. Upgrade to Pro for unlimited exports.',
  };
}

export function canExportJson(tier: ExportTier): CanExportResult {
  if (tier === 'PRO' || tier === 'ELITE') return { allowed: true };
  return {
    allowed: false,
    reason: 'JSON export is available for Pro and Elite. Upgrade to export.',
  };
}

export function canExportPdf(tier: ExportTier): CanExportResult {
  if (tier === 'ELITE') return { allowed: true };
  return {
    allowed: false,
    reason: 'PDF export is available for Elite. Upgrade to export.',
  };
}

/** Default date range: Free = last 30 days; Pro/Elite = last 10 years. */
export function getExportDateRange(tier: ExportTier): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  if (tier === 'FREE') {
    start.setDate(start.getDate() - 30);
  } else {
    start.setFullYear(start.getFullYear() - 10);
  }
  return { start, end };
}
