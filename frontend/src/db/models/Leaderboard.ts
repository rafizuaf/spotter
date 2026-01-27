/**
 * Leaderboard Model
 * Phase 2G: Social & Competition - Leaderboards
 *
 * Represents a leaderboard definition (read-only, seeded from server).
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date, children } from '@nozbe/watermelondb/decorators';
import type { Associations } from '@nozbe/watermelondb/Model';

export type LeaderboardMetricType = 'TOTAL_XP' | 'TOTAL_VOLUME' | 'WORKOUT_COUNT' | 'PR_COUNT';
export type LeaderboardTimePeriod = 'WEEKLY' | 'MONTHLY' | 'ALL_TIME';

export default class Leaderboard extends Model {
  static table = 'leaderboards';

  static associations: Associations = {
    leaderboard_entries: { type: 'has_many', foreignKey: 'leaderboard_id' },
  };

  // Server ID for sync
  @text('server_id') serverId!: string;

  // Leaderboard definition
  @text('code') code!: string;
  @text('title') title!: string;
  @text('description') description?: string | null;
  @text('metric_type') metricType!: LeaderboardMetricType;
  @text('time_period') timePeriod!: LeaderboardTimePeriod;

  // Display settings
  @field('is_active') isActive!: boolean;
  @field('display_order') displayOrder!: number;
  @text('icon_name') iconName!: string;
  @field('last_total_participants') lastTotalParticipants?: number;

  // Timestamps
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  // Relations
  @children('leaderboard_entries') entries!: unknown;

  /**
   * Get human-readable metric type
   */
  get metricTypeLabel(): string {
    const labels: Record<LeaderboardMetricType, string> = {
      TOTAL_XP: 'XP',
      TOTAL_VOLUME: 'Volume',
      WORKOUT_COUNT: 'Workouts',
      PR_COUNT: 'PRs',
    };
    return labels[this.metricType] || this.metricType;
  }

  /**
   * Get human-readable time period
   */
  get timePeriodLabel(): string {
    const labels: Record<LeaderboardTimePeriod, string> = {
      WEEKLY: 'This Week',
      MONTHLY: 'This Month',
      ALL_TIME: 'All Time',
    };
    return labels[this.timePeriod] || this.timePeriod;
  }

  /**
   * Get score suffix/unit
   */
  get scoreSuffix(): string {
    const suffixes: Record<LeaderboardMetricType, string> = {
      TOTAL_XP: ' XP',
      TOTAL_VOLUME: ' kg',
      WORKOUT_COUNT: '',
      PR_COUNT: ' PRs',
    };
    return suffixes[this.metricType] || '';
  }

  /**
   * Get icon name for React Native Ionicons
   */
  get ionIconName(): string {
    const iconMap: Record<string, string> = {
      barbell: 'barbell-outline',
      calendar: 'calendar-outline',
      star: 'star-outline',
      trophy: 'trophy-outline',
      crown: 'ribbon-outline',
      fire: 'flame-outline',
    };
    return iconMap[this.iconName] || 'trophy-outline';
  }
}

/**
 * Leaderboard code constants
 */
export const LEADERBOARD_CODES = {
  WEEKLY_VOLUME: 'WEEKLY_VOLUME',
  WEEKLY_WORKOUTS: 'WEEKLY_WORKOUTS',
  MONTHLY_XP: 'MONTHLY_XP',
  MONTHLY_PRS: 'MONTHLY_PRS',
  ALL_TIME_XP: 'ALL_TIME_XP',
  ALL_TIME_WORKOUTS: 'ALL_TIME_WORKOUTS',
} as const;

export type LeaderboardCode = (typeof LEADERBOARD_CODES)[keyof typeof LEADERBOARD_CODES];
