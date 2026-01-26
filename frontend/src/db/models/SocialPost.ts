import { Model } from '@nozbe/watermelondb';
import { date, readonly, text, relation, field } from '@nozbe/watermelondb/decorators';
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

  // Phase 2G: Reaction counts (cached from post_reactions table)
  @field('reaction_count_like') reactionCountLike!: number;
  @field('reaction_count_fire') reactionCountFire!: number;
  @field('reaction_count_muscle') reactionCountMuscle!: number;
  @field('reaction_count_clap') reactionCountClap!: number;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;

  // Relationships
  @relation('users', 'user_id') user!: User;
  @relation('workouts', 'workout_id') workout?: Workout;
}
