import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, relation } from '@nozbe/watermelondb/decorators';
import Workout from './Workout';
import Exercise from './Exercise';

export default class WorkoutSet extends Model {
  static table = 'workout_sets';

  static associations = {
    workouts: { type: 'belongs_to' as const, key: 'workout_id' },
    exercises: { type: 'belongs_to' as const, key: 'exercise_id' },
  };

  @text('server_id') serverId!: string;
  @text('workout_id') workoutId!: string;
  @text('exercise_id') exerciseId!: string;
  @field('weight_kg') weightKg?: number;
  @field('weight_plate_amount') weightPlateAmount?: number;
  @field('weight_base_amount') weightBaseAmount?: number;
  @text('original_input_unit') originalInputUnit?: string;
  @field('original_input_value') originalInputValue?: number;
  @field('reps') reps?: number;
  @field('rpe') rpe?: number;
  @field('rir') rir?: number;
  @field('is_failure') isFailure!: boolean;
  @text('note') note?: string;
  @field('rest_time_seconds') restTimeSeconds?: number;
  @field('duration_seconds') durationSeconds?: number;
  @field('distance_meters') distanceMeters?: number;
  @field('is_pr') isPr!: boolean;
  @field('set_order_index') setOrderIndex!: number;
  @text('superset_group_id') supersetGroupId?: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;

  @relation('workouts', 'workout_id') workout!: Workout;
  @relation('exercises', 'exercise_id') exercise!: Exercise;
}
