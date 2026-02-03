/**
 * PendingOperation Model
 * 
 * B7: Persistent offline queue for operations that need to be synced
 * Survives app restart and processes queue on app launch
 */

import { Model } from '@nozbe/watermelondb';
import { field, date, json, readonly } from '@nozbe/watermelondb/decorators';

export type OperationType = 'SYNC_WORKOUT' | 'FINISH_WORKOUT' | 'SYNC_ALL' | 'SYNC_CRITICAL' | 'SYNC_BACKGROUND';

export type OperationStatus = 'pending' | 'processing' | 'failed' | 'completed';

export default class PendingOperation extends Model {
  static table = 'pending_operations';

  @field('operation_type') operationType!: OperationType;
  @json('payload', (v) => v || {}) payload!: Record<string, unknown>;
  @field('attempts') attempts!: number;
  @field('max_attempts') maxAttempts!: number;
  @field('status') status!: OperationStatus;
  @field('last_error') lastError?: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('last_attempted_at') lastAttemptedAt?: Date;
}
