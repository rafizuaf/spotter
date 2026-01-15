import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, text, children, json } from '@nozbe/watermelondb/decorators';
import BeginnerProgramDay from './BeginnerProgramDay';

export default class BeginnerProgram extends Model {
  static table = 'beginner_programs';

  static associations = {
    beginner_program_days: { type: 'has_many' as const, foreignKey: 'program_id' },
  };

  @text('server_id') serverId!: string;
  @text('code') code!: string;
  @text('title') title!: string;
  @text('description') description?: string;
  @field('duration_weeks') durationWeeks!: number;
  @field('workouts_per_week') workoutsPerWeek!: number;
  @text('target_persona') targetPersona?: string;
  @text('icon_name') iconName?: string;
  @field('is_active') isActive!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;

  @children('beginner_program_days') days!: Query<BeginnerProgramDay>;

  // Helper to get total days in program
  get totalDays(): number {
    return this.durationWeeks * this.workoutsPerWeek;
  }
}
