import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, text, children } from '@nozbe/watermelondb/decorators';
import RoutineExercise from './RoutineExercise';

export default class Routine extends Model {
  static table = 'routines';

  static associations = {
    users: { type: 'belongs_to' as const, key: 'user_id' },
    routine_exercises: { type: 'has_many' as const, foreignKey: 'routine_id' },
  };

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;
  @text('name') name!: string;
  @text('notes') notes?: string;
  @field('is_public') isPublic!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;

  @children('routine_exercises') routineExercises!: Query<RoutineExercise>;
}
