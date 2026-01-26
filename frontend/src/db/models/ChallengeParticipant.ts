/**
 * ChallengeParticipant Model
 * Phase 2G: Social & Competition - Challenge System
 *
 * Represents a user's participation in a challenge with their score and rank.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type { Associations } from '@nozbe/watermelondb/Model';

export type ParticipantStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

export default class ChallengeParticipant extends Model {
  static table = 'challenge_participants';

  static associations: Associations = {
    challenges: { type: 'belongs_to', key: 'challenge_id' },
  };

  // Server ID for sync
  @text('server_id') serverId!: string;

  // Foreign keys
  @text('challenge_id') challengeId!: string;
  @text('user_id') userId!: string;

  // Participation state
  @text('status') status!: ParticipantStatus;
  @field('current_score') currentScore!: number;
  @field('rank') rank?: number | null;

  // Timestamps
  @date('joined_at') joinedAt!: Date;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date | null;

  // Relations
  @relation('challenges', 'challenge_id') challenge!: unknown;

  /**
   * Check if participant is actively competing
   */
  get isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  /**
   * Check if participant has completed the challenge
   */
  get hasCompleted(): boolean {
    return this.status === 'COMPLETED';
  }

  /**
   * Check if participant abandoned the challenge
   */
  get hasAbandoned(): boolean {
    return this.status === 'ABANDONED';
  }

  /**
   * Get formatted score
   */
  get formattedScore(): string {
    const score = this.currentScore || 0;
    if (score >= 1000000) {
      return `${(score / 1000000).toFixed(1)}M`;
    }
    if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}K`;
    }
    return score.toFixed(0);
  }

  /**
   * Get rank display string
   */
  get rankDisplay(): string {
    if (!this.rank) return '-';
    const suffix = getRankSuffix(this.rank);
    return `${this.rank}${suffix}`;
  }

  /**
   * Check if participant is in top 3
   */
  get isTopThree(): boolean {
    return this.rank !== null && this.rank !== undefined && this.rank <= 3;
  }

  /**
   * Get medal type for top 3
   */
  get medalType(): 'gold' | 'silver' | 'bronze' | null {
    if (this.rank === 1) return 'gold';
    if (this.rank === 2) return 'silver';
    if (this.rank === 3) return 'bronze';
    return null;
  }

  /**
   * Get status label
   */
  get statusLabel(): string {
    const labels: Record<ParticipantStatus, string> = {
      ACTIVE: 'Competing',
      COMPLETED: 'Finished',
      ABANDONED: 'Left',
    };
    return labels[this.status] || this.status;
  }

  /**
   * Get status color
   */
  get statusColor(): string {
    const colors: Record<ParticipantStatus, string> = {
      ACTIVE: '#4ade80', // Green
      COMPLETED: '#60a5fa', // Blue
      ABANDONED: '#a0a0a0', // Gray
    };
    return colors[this.status] || '#a0a0a0';
  }
}

/**
 * Get ordinal suffix for rank
 */
function getRankSuffix(rank: number): string {
  if (rank >= 11 && rank <= 13) return 'th';
  const lastDigit = rank % 10;
  switch (lastDigit) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Participant status utilities
 */
export const PARTICIPANT_STATUSES: ParticipantStatus[] = ['ACTIVE', 'COMPLETED', 'ABANDONED'];
