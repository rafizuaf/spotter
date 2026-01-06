import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, text, children } from '@nozbe/watermelondb/decorators';
import WorkoutSet from './WorkoutSet';

export default class Workout extends Model {
  static table = 'workouts';

  static associations = {
    users: { type: 'belongs_to' as const, key: 'user_id' },
    routines: { type: 'belongs_to' as const, key: 'routine_origin_id' },
    workout_sets: { type: 'has_many' as const, foreignKey: 'workout_id' },
  };

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;
  @text('routine_origin_id') routineOriginId?: string;
  @text('name') name?: string;
  @text('note') note?: string;
  @date('started_at') startedAt!: Date;
  @date('ended_at') endedAt?: Date;
  @text('local_timezone') localTimezone?: string;
  @text('visibility') visibility!: string;
  @field('wilks_score') wilksScore?: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;

  @children('workout_sets') sets!: Query<WorkoutSet>;
}
