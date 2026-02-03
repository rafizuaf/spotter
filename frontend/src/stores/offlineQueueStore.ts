/**
 * Offline Queue Store
 * 
 * B7: Persistent queue for offline operations that survives app restart
 * Processes queue on app launch and provides UI with pending count
 */

import { create } from 'zustand';
import { database, pendingOperationsCollection } from '../db';
import { Q } from '@nozbe/watermelondb';
import type PendingOperation from '../db/models/PendingOperation';
import type { OperationType, OperationStatus } from '../db/models/PendingOperation';
import { syncCritical, syncBackground, syncAll, syncOnDemand, type SyncOptions } from '../db/sync';
import { logError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

interface OfflineQueueState {
  pendingCount: number;
  isProcessing: boolean;
  enqueue: (type: OperationType, payload: Record<string, unknown>) => Promise<void>;
  processQueue: () => Promise<void>;
  getPendingCount: () => Promise<number>;
  clearCompleted: () => Promise<void>;
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds between retries

/**
 * B7: Enqueue an operation for later processing
 */
async function enqueueOperation(
  type: OperationType,
  payload: Record<string, unknown>
): Promise<void> {
  await database.write(async () => {
    await pendingOperationsCollection.create((operation) => {
      operation.operationType = type;
      operation.payload = payload;
      operation.attempts = 0;
      operation.maxAttempts = MAX_ATTEMPTS;
      operation.status = 'pending';
      operation.createdAt = new Date();
    });
  });

  logger.info('Operation enqueued', { type, payload });
}

/**
 * B7: Process a single pending operation
 */
async function processOperation(operation: PendingOperation): Promise<void> {
  // Mark as processing
  await database.write(async () => {
    await operation.update((op) => {
      op.status = 'processing';
      op.lastAttemptedAt = new Date();
      op.attempts = op.attempts + 1;
    });
  });

  try {
    const { operationType, payload } = operation;

    // Execute the operation based on type
    switch (operationType) {
      case 'SYNC_WORKOUT':
      case 'FINISH_WORKOUT':
      case 'SYNC_CRITICAL':
        await syncCritical(payload as SyncOptions);
        break;

      case 'SYNC_BACKGROUND':
        await syncBackground(payload as SyncOptions);
        break;

      case 'SYNC_ALL':
        await syncAll(payload as SyncOptions);
        break;

      default:
        throw new Error(`Unknown operation type: ${operationType}`);
    }

    // Mark as completed
    await database.write(async () => {
      await operation.update((op) => {
        op.status = 'completed';
        op.lastError = undefined;
      });
    });

    logger.info('Operation completed', { operationType, operationId: operation.id });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if we've exceeded max attempts
    const shouldRetry = operation.attempts < operation.maxAttempts;

    await database.write(async () => {
      await operation.update((op) => {
        op.lastError = errorMessage;
        if (shouldRetry) {
          op.status = 'pending'; // Retry later
        } else {
          op.status = 'failed'; // Max attempts exceeded
        }
      });
    });

    logger.warn('Operation failed', {
      operationType: operation.operationType,
      attempts: operation.attempts,
      maxAttempts: operation.maxAttempts,
      error: errorMessage,
      willRetry: shouldRetry,
    });

    if (!shouldRetry) {
      throw error; // Re-throw if max attempts exceeded
    }
  }
}

/**
 * B7: Get count of pending operations
 */
async function getPendingCount(): Promise<number> {
  try {
    const pending = await pendingOperationsCollection
      .query(Q.where('status', 'pending'))
      .fetchCount();

    return pending;
  } catch (error) {
    logError(error, 'offlineQueue_getPendingCount');
    return 0;
  }
}

/**
 * B7: Process all pending operations in queue
 */
async function processQueue(): Promise<void> {
  try {
    // Get all pending operations
    const pending = await pendingOperationsCollection
      .query(
        Q.where('status', 'pending'),
        Q.sortBy('created_at', Q.asc) // Process oldest first
      )
      .fetch();

    if (pending.length === 0) {
      return;
    }

    logger.info('Processing offline queue', { count: pending.length });

    // Process operations sequentially (to avoid overwhelming the network)
    for (const operation of pending) {
      try {
        await processOperation(operation);
        // Add delay between operations to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        // Continue processing other operations even if one fails
        logError(error, 'offlineQueue_processOperation');
      }
    }

    logger.info('Offline queue processing complete', { processed: pending.length });
  } catch (error) {
    logError(error, 'offlineQueue_processQueue');
  }
}

/**
 * B7: Clear completed operations (cleanup)
 */
async function clearCompleted(): Promise<void> {
  try {
    const completed = await pendingOperationsCollection
      .query(Q.where('status', 'completed'))
      .fetch();

    await database.write(async () => {
      await Promise.all(completed.map((op) => op.markAsDeleted()));
    });

    logger.info('Cleared completed operations', { count: completed.length });
  } catch (error) {
    logError(error, 'offlineQueue_clearCompleted');
  }
}

export const useOfflineQueueStore = create<OfflineQueueState>((set, get) => ({
  pendingCount: 0,
  isProcessing: false,

  enqueue: async (type: OperationType, payload: Record<string, unknown>) => {
    await enqueueOperation(type, payload);
    // Update pending count
    const count = await getPendingCount();
    set({ pendingCount: count });
  },

  processQueue: async () => {
    const state = get();
    if (state.isProcessing) {
      return; // Already processing
    }

    set({ isProcessing: true });
    try {
      await processQueue();
      // Update pending count after processing
      const count = await getPendingCount();
      set({ pendingCount: count });
    } finally {
      set({ isProcessing: false });
    }
  },

  getPendingCount: async () => {
    const count = await getPendingCount();
    set({ pendingCount: count });
    return count;
  },

  clearCompleted: async () => {
    await clearCompleted();
    // Update pending count after cleanup
    const count = await getPendingCount();
    set({ pendingCount: count });
  },
}));
