import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, relation } from '@nozbe/watermelondb/decorators';

export default class UserXpLog extends Model {
  static table = 'user_xp_logs';

  static associations = {
    users: { type: 'belongs_to' as const, key: 'user_id' },
  };

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;
  @text('source_type') sourceType!: string; // 'SET', 'WORKOUT', 'BONUS'
  @text('source_id') sourceId?: string;
  @field('xp_amount') xpAmount!: number;
  @readonly @date('created_at') createdAt!: Date;
}
