import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export default class UserBadge extends Model {
  static table = 'user_badges';

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;
  @text('achievement_code') achievementCode!: string;
  @date('earned_at') earnedAt!: Date;
  @field('is_rusty') isRusty!: boolean;
  @date('last_maintained_at') lastMaintainedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;
}
