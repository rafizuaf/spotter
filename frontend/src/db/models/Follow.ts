import { Model } from '@nozbe/watermelondb';
import { date, readonly, text, relation } from '@nozbe/watermelondb/decorators';
import type User from './User';

export default class Follow extends Model {
  static table = 'follows';

  static associations = {
    users: { type: 'belongs_to' as const, key: 'follower_id' },
  };

  @text('server_id') serverId!: string;
  @text('follower_id') followerId!: string;
  @text('following_id') followingId!: string;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;

  // Relationships
  @relation('users', 'follower_id') follower!: User;
}
