import { Model } from '@nozbe/watermelondb';
import { field, date, text } from '@nozbe/watermelondb/decorators';

export default class UserLevel extends Model {
  static table = 'user_levels';

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;
  @field('total_xp') totalXp!: number;
  @field('level') level!: number;
  @field('xp_to_next_level') xpToNextLevel!: number;
  @date('updated_at') updatedAt!: Date;
}
