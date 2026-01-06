import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, relation } from '@nozbe/watermelondb/decorators';
import Routine from './Routine';
import Exercise from './Exercise';

export default class RoutineExercise extends Model {
  static table = 'routine_exercises';

  static associations = {
    routines: { type: 'belongs_to' as const, key: 'routine_id' },
    exercises: { type: 'belongs_to' as const, key: 'exercise_id' },
  };

  @text('server_id') serverId!: string;
  @text('routine_id') routineId!: string;
  @text('exercise_id') exerciseId!: string;
  @text('order_index') orderIndex!: string;
  @field('target_sets') targetSets?: number;
  @field('target_reps') targetReps?: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;

  @relation('routines', 'routine_id') routine!: Routine;
  @relation('exercises', 'exercise_id') exercise!: Exercise;
}
