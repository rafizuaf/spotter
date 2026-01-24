/**
 * Phase 2D: Tier resolution and export limits (Free 1x/month CSV, Pro/Elite).
 */

import * as SecureStore from 'expo-secure-store';
import { Q } from '@nozbe/watermelondb';
import { usersCollection } from '../../db';

const LAST_EXPORT_KEY = 'spotter_last_export_at';

export type ExportTier = 'FREE' | 'PRO' | 'ELITE';

export interface CanExportResult {
  allowed: boolean;
  reason?: string;
}

/** Resolve tier from users table (server_id = auth user id). Default FREE. */
export async function getTier(userId: string): Promise<ExportTier> {
  const rows = await usersCollection
    .query(Q.where('server_id', userId))
    .fetch();
  const u = rows[0];
  const t = u?.subscriptionTier?.toUpperCase();
  if (t === 'PRO' || t === 'ELITE') return t;
  return 'FREE';
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
