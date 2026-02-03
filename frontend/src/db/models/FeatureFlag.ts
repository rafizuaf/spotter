/**
 * FeatureFlag Model
 * 
 * B10: Feature flags synced from server for client-side feature gating
 * Read-only (flags controlled server-side)
 */

import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export default class FeatureFlag extends Model {
  static table = 'feature_flags';

  @text('flag_key') flagKey!: string; // Primary key
  @field('enabled') enabled!: boolean;
  @field('rollout_percent') rolloutPercent!: number; // 0-100
  @text('target_tiers') targetTiers!: string; // JSON array string: ["PRO", "ELITE"] or "[]"
  @text('description') description?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
