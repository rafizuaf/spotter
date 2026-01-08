import { Model } from '@nozbe/watermelondb';
import { date, readonly, text, relation } from '@nozbe/watermelondb/decorators';
import type User from './User';

export default class PushDevice extends Model {
  static table = 'push_devices';

  static associations = {
    users: { type: 'belongs_to' as const, key: 'user_id' },
  };

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;
  @text('expo_push_token') expoPushToken!: string;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;

  // Relationships
  @relation('users', 'user_id') user!: User;
}
