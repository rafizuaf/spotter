import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, relation, json } from '@nozbe/watermelondb/decorators';
import AdvancedProgram from './AdvancedProgram';

export interface AdvancedProgramSet {
  percent_tm: number;
  reps: number;
}

export interface AdvancedProgramDayExercise {
  exercise_id: string;
  sets: AdvancedProgramSet[];
}

const sanitizeExercises = (raw: unknown): AdvancedProgramDayExercise[] => {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw;
  return [];
};

export default class AdvancedProgramDay extends Model {
  static table = 'advanced_program_days';

  static associations = {
    advanced_programs: { type: 'belongs_to' as const, key: 'program_id' },
  };

  @text('server_id') serverId!: string;
  @text('program_id') programId!: string;
  @field('week_number') weekNumber!: number;
  @field('day_number') dayNumber!: number;
  @text('day_title') dayTitle!: string;
  @json('exercises', sanitizeExercises) exercises!: AdvancedProgramDayExercise[];
  @field('order_index') orderIndex!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;

  @relation('advanced_programs', 'program_id') program!: AdvancedProgram;

  get weekDayLabel(): string {
    return `Week ${this.weekNumber}, Day ${this.dayNumber}`;
  }
}
