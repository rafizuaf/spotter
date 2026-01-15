import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, relation, json } from '@nozbe/watermelondb/decorators';
import BeginnerProgram from './BeginnerProgram';

// Type for exercise configuration in a program day
export interface ProgramDayExercise {
  exercise_id: string;
  sets: number;
  reps: string; // Can be "8-12" or "10" or "As many as possible"
  notes?: string;
}

const sanitizeExercises = (raw: unknown): ProgramDayExercise[] => {
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

export default class BeginnerProgramDay extends Model {
  static table = 'beginner_program_days';

  static associations = {
    beginner_programs: { type: 'belongs_to' as const, key: 'program_id' },
  };

  @text('server_id') serverId!: string;
  @text('program_id') programId!: string;
  @field('week_number') weekNumber!: number;
  @field('day_number') dayNumber!: number;
  @text('day_title') dayTitle!: string;
  @text('lesson_title') lessonTitle!: string;
  @text('lesson_content') lessonContent!: string;
  @json('exercises', sanitizeExercises) exercises!: ProgramDayExercise[];
  @field('order_index') orderIndex!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;

  @relation('beginner_programs', 'program_id') program!: BeginnerProgram;

  // Helper: Get formatted week/day label
  get weekDayLabel(): string {
    return `Week ${this.weekNumber}, Day ${this.dayNumber}`;
  }

  // Helper: Check if this is the first day
  get isFirstDay(): boolean {
    return this.orderIndex === 1;
  }

  // Helper: Check if this is the last day
  get isLastDay(): boolean {
    return this.orderIndex === 12;
  }
}
