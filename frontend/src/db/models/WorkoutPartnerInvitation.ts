/**
 * WorkoutPartnerInvitation Model
 * Phase 2G: Social & Competition - Workout Partners
 *
 * Represents a pending invitation to join a workout as a partner.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, relation } from '@nozbe/watermelondb/decorators';
import type { Associations } from '@nozbe/watermelondb/Model';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export default class WorkoutPartnerInvitation extends Model {
  static table = 'workout_partner_invitations';

  static associations: Associations = {
    workouts: { type: 'belongs_to', key: 'workout_id' },
    inviters: { type: 'belongs_to', key: 'inviter_user_id' },
    invitees: { type: 'belongs_to', key: 'invitee_user_id' },
  };

  // Server ID for sync
  @text('server_id') serverId!: string;

  // Foreign keys
  @text('workout_id') workoutId!: string;
  @text('inviter_user_id') inviterUserId!: string;
  @text('invitee_user_id') inviteeUserId!: string;

  // Status
  @text('status') status!: InvitationStatus;

  // Expiration
  @date('expires_at') expiresAt!: Date;

  // Timestamps
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date | null;

  // Relations
  @relation('workouts', 'workout_id') workout!: unknown;
  @relation('inviters', 'inviter_user_id') inviter!: unknown;
  @relation('invitees', 'invitee_user_id') invitee!: unknown;

  /**
   * Check if invitation is pending
   */
  get isPending(): boolean {
    return this.status === 'PENDING' && !this.isExpired;
  }

  /**
   * Check if invitation is expired
   */
  get isExpired(): boolean {
    return new Date(this.expiresAt) < new Date() || this.status === 'EXPIRED';
  }

  /**
   * Check if invitation is accepted
   */
  get isAccepted(): boolean {
    return this.status === 'ACCEPTED';
  }

  /**
   * Check if invitation is declined
   */
  get isDeclined(): boolean {
    return this.status === 'DECLINED';
  }
}
