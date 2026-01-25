import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export default class UserAdvancedProgramEnrollment extends Model {
  static table = 'user_advanced_program_enrollments';

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;
  @text('program_id') programId!: string;
  @field('current_week') currentWeek!: number;
  @field('current_day') currentDay!: number;
  @date('started_at') startedAt!: Date;
  @date('completed_at') completedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;

  get isCompleted(): boolean {
    return this.completedAt != null;
  }
}
