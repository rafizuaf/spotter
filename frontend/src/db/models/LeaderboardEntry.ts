/**
 * LeaderboardEntry Model
 * Phase 2G: Social & Competition - Leaderboards
 *
 * Represents a cached leaderboard entry (user's rank and score).
 * Read-only, computed by server-side scheduled job.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date, relation } from '@nozbe/watermelondb/decorators';
import type { Associations } from '@nozbe/watermelondb/Model';

export default class LeaderboardEntry extends Model {
  static table = 'leaderboard_entries';

  static associations: Associations = {
    leaderboards: { type: 'belongs_to', key: 'leaderboard_id' },
  };

  // Server ID for sync
  @text('server_id') serverId!: string;

  // Foreign keys
  @text('leaderboard_id') leaderboardId!: string;
  @text('user_id') userId!: string;

  // Ranking data
  @field('rank') rank!: number;
  @field('score') score!: number;

  // Period tracking
  @date('period_start') periodStart!: Date;
  @date('period_end') periodEnd!: Date;
  @date('computed_at') computedAt!: Date;

  // Timestamps
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  // Relations
  @relation('leaderboards', 'leaderboard_id') leaderboard!: unknown;

  /**
   * Get formatted score string
   */
  get formattedScore(): string {
    const score = this.score || 0;
    if (score >= 1000000) {
      return `${(score / 1000000).toFixed(1)}M`;
    }
    if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}K`;
    }
    return score.toLocaleString();
  }

  /**
   * Get rank with ordinal suffix
   */
  get rankDisplay(): string {
    const rank = this.rank;
    const suffix = getRankSuffix(rank);
    return `${rank}${suffix}`;
  }

  /**
   * Check if in top 3
   */
  get isTopThree(): boolean {
    return this.rank <= 3;
  }

  /**
   * Get medal type for display
   */
  get medalType(): 'gold' | 'silver' | 'bronze' | null {
    if (this.rank === 1) return 'gold';
    if (this.rank === 2) return 'silver';
    if (this.rank === 3) return 'bronze';
    return null;
  }

  /**
   * Get medal emoji
   */
  get medalEmoji(): string {
    if (this.rank === 1) return '🥇';
    if (this.rank === 2) return '🥈';
    if (this.rank === 3) return '🥉';
    return '';
  }

  /**
   * Get medal color
   */
  get medalColor(): string {
    if (this.rank === 1) return '#FFD700'; // Gold
    if (this.rank === 2) return '#C0C0C0'; // Silver
    if (this.rank === 3) return '#CD7F32'; // Bronze
    return '#a0a0a0';
  }

  /**
   * Check if entry is for current period
   */
  get isCurrentPeriod(): boolean {
    const now = new Date();
    return now >= this.periodStart && now <= this.periodEnd;
  }

  /**
   * Get period label (e.g., "Week of Jan 20" or "January 2026")
   */
  get periodLabel(): string {
    const start = this.periodStart;
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

    // Check if it's a weekly period (roughly 7 days)
    const durationDays = (this.periodEnd.getTime() - this.periodStart.getTime()) / (1000 * 60 * 60 * 24);

    if (durationDays <= 8) {
      return `Week of ${start.toLocaleDateString('en-US', options)}`;
    } else if (durationDays <= 32) {
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      return 'All Time';
    }
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
