/**
 * WorkoutPartner Model
 * Phase 2G: Social & Competition - Workout Partners
 *
 * Represents a user's partnership with another user in a workout session.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, relation } from '@nozbe/watermelondb/decorators';
import type { Associations } from '@nozbe/watermelondb/Model';

export type PartnerStatus = 'ACTIVE' | 'LEFT' | 'COMPLETED';

export default class WorkoutPartner extends Model {
  static table = 'workout_partners';

  static associations: Associations = {
    workouts: { type: 'belongs_to', key: 'workout_id' },
    users: { type: 'belongs_to', key: 'user_id' },
    partner_users: { type: 'belongs_to', key: 'partner_user_id' },
  };

  // Server ID for sync
  @text('server_id') serverId!: string;

  // Foreign keys
  @text('workout_id') workoutId!: string;
  @text('user_id') userId!: string;
  @text('partner_user_id') partnerUserId!: string;

  // Status
  @text('status') status!: PartnerStatus;

  // Timestamps
  @date('joined_at') joinedAt!: Date;
  @date('left_at') leftAt?: Date | null;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date | null;

  // Relations
  @relation('workouts', 'workout_id') workout!: unknown;
  @relation('users', 'user_id') user!: unknown;
  @relation('partner_users', 'partner_user_id') partnerUser!: unknown;

  /**
   * Check if partner is actively training
   */
  get isActive(): boolean {
    return this.status === 'ACTIVE' && !this.deletedAt;
  }

  /**
   * Check if partner has left
   */
  get hasLeft(): boolean {
    return this.status === 'LEFT' || !!this.leftAt;
  }

  /**
   * Check if partnership is completed
   */
  get isCompleted(): boolean {
    return this.status === 'COMPLETED';
  }
}
