import { Model } from '@nozbe/watermelondb';
import { date, readonly, text, relation } from '@nozbe/watermelondb/decorators';
import type User from './User';
import type Workout from './Workout';

export default class SocialPost extends Model {
  static table = 'social_posts';

  static associations = {
    users: { type: 'belongs_to' as const, key: 'user_id' },
    workouts: { type: 'belongs_to' as const, key: 'workout_id' },
  };

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;
  @text('workout_id') workoutId?: string;
  @text('achievement_code') achievementCode?: string;
  @text('generated_headline') generatedHeadline!: string;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;

  // Relationships
  @relation('users', 'user_id') user!: User;
  @relation('workouts', 'workout_id') workout?: Workout;
}
