import { Model } from '@nozbe/watermelondb';
import { date, readonly, text, relation } from '@nozbe/watermelondb/decorators';
import type User from './User';

export default class UserBlock extends Model {
  static table = 'user_blocks';

  static associations = {
    users: { type: 'belongs_to' as const, key: 'blocker_id' },
  };

  @text('server_id') serverId!: string;
  @text('blocker_id') blockerId!: string;
  @text('blocked_id') blockedId!: string;

  @readonly @date('created_at') createdAt!: Date;

  // Relationships
  @relation('users', 'blocker_id') blocker!: User;
}
