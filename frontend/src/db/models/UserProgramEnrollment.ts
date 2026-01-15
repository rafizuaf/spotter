import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, text, relation, children } from '@nozbe/watermelondb/decorators';
import BeginnerProgram from './BeginnerProgram';
import UserProgramDayProgress from './UserProgramDayProgress';

export default class UserProgramEnrollment extends Model {
  static table = 'user_program_enrollments';

  static associations = {
    users: { type: 'belongs_to' as const, key: 'user_id' },
    beginner_programs: { type: 'belongs_to' as const, key: 'program_id' },
    user_program_day_progress: { type: 'has_many' as const, foreignKey: 'enrollment_id' },
  };

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;
  @text('program_id') programId!: string;
  @field('current_day_index') currentDayIndex!: number;
  @field('days_completed') daysCompleted!: number;
  @date('started_at') startedAt!: Date;
  @date('completed_at') completedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;

  @relation('beginner_programs', 'program_id') program!: BeginnerProgram;
  @children('user_program_day_progress') dayProgress!: Query<UserProgramDayProgress>;

  // Helper: Check if program is complete
  get isCompleted(): boolean {
    return this.completedAt !== null && this.completedAt !== undefined;
  }

  // Helper: Get progress percentage (0-100)
  get progressPercent(): number {
    return Math.round((this.daysCompleted / 12) * 100);
  }

  // Helper: Get current week number (1-4)
  get currentWeek(): number {
    return Math.ceil(this.currentDayIndex / 3);
  }

  // Helper: Get current day within week (1-3)
  get currentDayInWeek(): number {
    const remainder = this.currentDayIndex % 3;
    return remainder === 0 ? 3 : remainder;
  }
}
