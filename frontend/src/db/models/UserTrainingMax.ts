import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export default class UserTrainingMax extends Model {
  static table = 'user_training_maxes';

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;
  @text('exercise_id') exerciseId!: string;
  @field('training_max_kg') trainingMaxKg!: number;
  @field('one_rep_max_kg') oneRepMaxKg?: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;
}
