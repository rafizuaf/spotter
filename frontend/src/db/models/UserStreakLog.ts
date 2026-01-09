import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

/**
 * UserStreakLog - Tracks consecutive qualifying weeks
 *
 * Records streak progress for weekly-based achievements.
 * Example: "8 consecutive weeks with 4+ workouts"
 */
export default class UserStreakLog extends Model {
  static table = 'user_streak_logs';

  static associations = {
    users: { type: 'belongs_to' as const, key: 'user_id' },
  };

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;

  // Streak type: WEEKLY_3, WEEKLY_4, WEEKLY_5, WEEKLY_ANY
  @text('streak_type') streakType!: string;

  // Current streak length in weeks
  @field('streak_length') streakLength!: number;

  // The week this streak ended (or is current as of)
  @text('week_ended') weekEnded!: string;

  // Is this streak currently active?
  @field('is_active') isActive!: boolean;

  // Timestamps
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  /**
   * Get human-readable streak type
   */
  get streakTypeDisplay(): string {
    const displays: Record<string, string> = {
      WEEKLY_3: '3+ workouts/week',
      WEEKLY_4: '4+ workouts/week',
      WEEKLY_5: '5+ workouts/week',
      WEEKLY_ANY: '1+ workout/week',
    };
    return displays[this.streakType] || this.streakType;
  }

  /**
   * Get streak description
   */
  get streakDescription(): string {
    if (this.streakLength === 1) {
      return `1 week of ${this.streakTypeDisplay}`;
    }
    return `${this.streakLength} consecutive weeks of ${this.streakTypeDisplay}`;
  }

  /**
   * Check if streak is at milestone (4, 8, 12, 26, 52 weeks)
   */
  get isAtMilestone(): boolean {
    return [4, 8, 12, 26, 52].includes(this.streakLength);
  }

  /**
   * Get next milestone
   */
  get nextMilestone(): number {
    const milestones = [4, 8, 12, 26, 52];
    return milestones.find(m => m > this.streakLength) || 52;
  }

  /**
   * Get weeks remaining to next milestone
   */
  get weeksToNextMilestone(): number {
    return this.nextMilestone - this.streakLength;
  }
}
