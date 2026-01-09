import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

/**
 * UserActivityWeek - Tracks workout activity per week
 *
 * Part of the weekly streak system that replaces harmful daily streaks.
 * Encourages consistency (3-4 workouts/week) while allowing rest days.
 */
export default class UserActivityWeek extends Model {
  static table = 'user_activity_weeks';

  static associations = {
    users: { type: 'belongs_to' as const, key: 'user_id' },
  };

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;

  // Week identifier (Monday of that week)
  @text('week_start') weekStart!: string;

  // Activity metrics
  @field('active_days') activeDays!: number;
  @field('workouts_completed') workoutsCompleted!: number;
  @field('total_sets') totalSets!: number;
  @field('total_volume_kg') totalVolumeKg!: number;

  // Timestamps
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  /**
   * Check if this week qualifies for a specific streak type
   */
  qualifiesForStreak(streakType: 'WEEKLY_3' | 'WEEKLY_4' | 'WEEKLY_5' | 'WEEKLY_ANY'): boolean {
    const thresholds = {
      WEEKLY_3: 3,
      WEEKLY_4: 4,
      WEEKLY_5: 5,
      WEEKLY_ANY: 1,
    };
    return this.workoutsCompleted >= thresholds[streakType];
  }

  /**
   * Check if this is a "perfect week" (5+ workouts)
   */
  get isPerfectWeek(): boolean {
    return this.workoutsCompleted >= 5;
  }

  /**
   * Get formatted week range (e.g., "Jan 6 - Jan 12")
   */
  get weekRangeFormatted(): string {
    const start = new Date(this.weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  }
}
