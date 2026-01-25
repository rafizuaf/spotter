import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, text, children } from '@nozbe/watermelondb/decorators';
import AdvancedProgramDay from './AdvancedProgramDay';

export default class AdvancedProgram extends Model {
  static table = 'advanced_programs';

  static associations = {
    advanced_program_days: { type: 'has_many' as const, foreignKey: 'program_id' },
  };

  @text('server_id') serverId!: string;
  @text('code') code!: string;
  @text('title') title!: string;
  @text('description') description?: string;
  @field('duration_weeks') durationWeeks!: number;
  @field('workouts_per_week') workoutsPerWeek!: number;
  @field('is_active') isActive!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;

  @children('advanced_program_days') days!: Query<AdvancedProgramDay>;

  get totalDays(): number {
    return this.durationWeeks * this.workoutsPerWeek;
  }
}
