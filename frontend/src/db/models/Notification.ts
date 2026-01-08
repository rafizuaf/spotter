import { Model } from '@nozbe/watermelondb';
import { date, readonly, text, relation } from '@nozbe/watermelondb/decorators';
import type User from './User';

// Notification types as defined in database schema
export type NotificationType =
  | 'FOLLOW'
  | 'LIKE'
  | 'COMMENT'
  | 'ACHIEVEMENT'
  | 'PR'
  | 'STREAK'
  | 'SYSTEM'
  | 'LEVEL_UP';

export default class Notification extends Model {
  static table = 'notifications';

  static associations = {
    users: { type: 'belongs_to' as const, key: 'recipient_id' },
  };

  @text('server_id') serverId!: string;
  @text('recipient_id') recipientId!: string;
  @text('actor_id') actorId?: string;
  @text('type') type!: NotificationType;
  @text('metadata') metadata!: string; // JSON string
  @text('title') title!: string;
  @text('body') body?: string;
  @date('read_at') readAt?: Date;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;

  // Relationships
  @relation('users', 'recipient_id') recipient!: User;

  // Helper to parse metadata JSON
  get parsedMetadata(): Record<string, unknown> {
    try {
      return JSON.parse(this.metadata || '{}');
    } catch {
      return {};
    }
  }

  // Helper to check if notification is read
  get isRead(): boolean {
    return this.readAt !== undefined && this.readAt !== null;
  }
}
