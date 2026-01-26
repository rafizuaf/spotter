/**
 * Challenge Model
 * Phase 2G: Social & Competition - Challenge System
 *
 * Represents a fitness challenge that users can create and participate in.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, children } from '@nozbe/watermelondb/decorators';
import type { Associations } from '@nozbe/watermelondb/Model';

export type ChallengeType = 'MOST_VOLUME' | 'MOST_WORKOUTS' | 'MOST_SETS' | 'FIRST_TO_TARGET';
export type ChallengeStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type ChallengeVisibility = 'PUBLIC' | 'FOLLOWERS' | 'INVITE_ONLY';

export default class Challenge extends Model {
  static table = 'challenges';

  static associations: Associations = {
    challenge_participants: { type: 'has_many', foreignKey: 'challenge_id' },
  };

  // Server ID for sync
  @text('server_id') serverId!: string;

  // Creator of the challenge
  @text('created_by_id') createdById!: string;

  // Challenge details
  @text('title') title!: string;
  @text('description') description?: string | null;
  @text('challenge_type') challengeType!: ChallengeType;
  @field('target_value') targetValue?: number | null;

  // Schedule
  @date('start_date') startDate!: Date;
  @date('end_date') endDate!: Date;

  // State
  @text('status') status!: ChallengeStatus;
  @text('visibility') visibility!: ChallengeVisibility;
  @field('max_participants') maxParticipants!: number;

  // Timestamps
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date | null;

  // Relations
  @children('challenge_participants') participants!: unknown;

  /**
   * Check if challenge is currently active
   */
  get isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  /**
   * Check if challenge is joinable (pending or active)
   */
  get isJoinable(): boolean {
    return this.status === 'PENDING' || this.status === 'ACTIVE';
  }

  /**
   * Check if challenge has ended
   */
  get hasEnded(): boolean {
    return this.status === 'COMPLETED' || this.status === 'CANCELLED';
  }

  /**
   * Get days remaining until end
   */
  get daysRemaining(): number {
    if (this.hasEnded) return 0;
    const now = new Date();
    const diffMs = this.endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  /**
   * Get human-readable challenge type
   */
  get challengeTypeLabel(): string {
    const labels: Record<ChallengeType, string> = {
      MOST_VOLUME: 'Most Volume',
      MOST_WORKOUTS: 'Most Workouts',
      MOST_SETS: 'Most Sets',
      FIRST_TO_TARGET: 'Race to Target',
    };
    return labels[this.challengeType] || this.challengeType;
  }

  /**
   * Get challenge type icon name
   */
  get challengeTypeIcon(): string {
    const icons: Record<ChallengeType, string> = {
      MOST_VOLUME: 'barbell',
      MOST_WORKOUTS: 'calendar',
      MOST_SETS: 'layers',
      FIRST_TO_TARGET: 'flag',
    };
    return icons[this.challengeType] || 'trophy';
  }

  /**
   * Get visibility label
   */
  get visibilityLabel(): string {
    const labels: Record<ChallengeVisibility, string> = {
      PUBLIC: 'Public',
      FOLLOWERS: 'Followers Only',
      INVITE_ONLY: 'Invite Only',
    };
    return labels[this.visibility] || this.visibility;
  }

  /**
   * Get status label
   */
  get statusLabel(): string {
    const labels: Record<ChallengeStatus, string> = {
      PENDING: 'Starting Soon',
      ACTIVE: 'In Progress',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
    };
    return labels[this.status] || this.status;
  }

  /**
   * Get status color
   */
  get statusColor(): string {
    const colors: Record<ChallengeStatus, string> = {
      PENDING: '#fbbf24', // Amber
      ACTIVE: '#4ade80', // Green
      COMPLETED: '#60a5fa', // Blue
      CANCELLED: '#f87171', // Red
    };
    return colors[this.status] || '#a0a0a0';
  }
}

/**
 * Challenge type utilities
 */
export const CHALLENGE_TYPES: ChallengeType[] = ['MOST_VOLUME', 'MOST_WORKOUTS', 'MOST_SETS', 'FIRST_TO_TARGET'];
export const CHALLENGE_STATUSES: ChallengeStatus[] = ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
export const CHALLENGE_VISIBILITIES: ChallengeVisibility[] = ['PUBLIC', 'FOLLOWERS', 'INVITE_ONLY'];
