import { Model } from '@nozbe/watermelondb';
import { field, date, text } from '@nozbe/watermelondb/decorators';

/**
 * UserEntitlement Model
 *
 * SECURITY: This table is READ-ONLY on the server (users cannot modify).
 * Entitlements are only updated by the payment-webhook edge function.
 * This model is synced via pull-only (not push).
 */
export default class UserEntitlement extends Model {
  static table = 'user_entitlements';

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;
  @text('tier') tier!: string; // 'FREE' | 'PRO' | 'ELITE'
  @field('is_trial') isTrial!: boolean;
  @date('trial_ends_at') trialEndsAt?: Date;
  @date('valid_until') validUntil?: Date;
  @text('source') source!: string; // 'STRIPE' | 'REVENUECAT' | 'MANUAL_GIFT' | 'LIFETIME'
  @date('updated_at') updatedAt!: Date;

  /**
   * Check if the entitlement is currently active
   */
  get isActive(): boolean {
    // If there's no valid_until, it's a lifetime subscription
    if (!this.validUntil) return true;

    // Check if still within validity period
    return new Date() < new Date(this.validUntil);
  }

  /**
   * Check if trial is active
   */
  get isTrialActive(): boolean {
    if (!this.isTrial || !this.trialEndsAt) return false;
    return new Date() < new Date(this.trialEndsAt);
  }

  /**
   * Get the effective tier (accounting for expiry)
   */
  get effectiveTier(): 'FREE' | 'PRO' | 'ELITE' {
    if (!this.isActive && !this.isTrialActive) {
      return 'FREE';
    }
    const tier = this.tier.toUpperCase();
    if (tier === 'PRO' || tier === 'ELITE') {
      return tier;
    }
    return 'FREE';
  }

  /**
   * Check if user can access a required tier
   */
  canAccess(requiredTier: 'FREE' | 'PRO' | 'ELITE'): boolean {
    const tierOrder = { FREE: 0, PRO: 1, ELITE: 2 };
    return tierOrder[this.effectiveTier] >= tierOrder[requiredTier];
  }

  /**
   * Days until expiration (null if lifetime)
   */
  get daysUntilExpiry(): number | null {
    if (!this.validUntil) return null;
    const now = new Date();
    const expiry = new Date(this.validUntil);
    const diffMs = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }
}
