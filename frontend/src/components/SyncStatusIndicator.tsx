/**
 * SyncStatusIndicator Component
 * 
 * Shows sync status and pending changes count
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { hasPendingChanges, syncDatabase } from '../db/sync';
import { useAuthStore } from '../stores/authStore';
import { useSyncStatusStore } from '../stores/syncStatusStore';
import { CircuitOpenError } from '../utils/circuitBreaker';
import { logError } from '../utils/errorHandler';

interface SyncStatusIndicatorProps {
  /** Show full status or just icon */
  compact?: boolean;
  /** Callback when sync is triggered */
  onSyncComplete?: () => void;
}

export default function SyncStatusIndicator({
  compact = false,
  onSyncComplete,
}: SyncStatusIndicatorProps) {
  const colors = useTheme();
  const { user } = useAuthStore();
  const { lastError: backgroundSyncError, clearError } = useSyncStatusStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for pending changes periodically
  useEffect(() => {
    if (!user) return;

    const checkPending = async () => {
      try {
        const pending = await hasPendingChanges();
        setHasPending(pending);
      } catch (err) {
        logError(err, 'SyncStatusIndicator_checkPending');
      }
    };

    // Check immediately
    checkPending();

    // Check every 30 seconds
    const interval = setInterval(checkPending, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const handleSync = async () => {
    if (isSyncing || !user) return;

    setIsSyncing(true);
    setError(null);
    // B2: Clear background sync error when manually syncing
    clearError();

    try {
      await syncDatabase();
      setHasPending(false);
      setLastSyncTime(new Date());
      // B2: Clear background sync error on successful sync
      clearError();
      onSyncComplete?.();
    } catch (err) {
      // B3: Handle circuit breaker errors specially
      if (err instanceof CircuitOpenError) {
        const retryAfterSeconds = Math.ceil(err.retryAfterMs / 1000);
        setError(`Sync paused; will retry shortly. (Retry in ${retryAfterSeconds}s)`);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Sync failed';
        setError(errorMessage);
      }
      logError(err, 'SyncStatusIndicator_sync');
    } finally {
      setIsSyncing(false);
    }
  };

  // B2: Combine manual sync error with background sync error
  const displayError = error || backgroundSyncError;

  const formatLastSync = (): string => {
    if (!lastSyncTime) return 'Never synced';
    
    const diffMs = Date.now() - lastSyncTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={handleSync}
        disabled={isSyncing}
        style={styles.compactContainer}
        accessible={true}
        accessibilityLabel={hasPending ? 'Sync pending changes' : 'Sync data'}
        accessibilityRole="button"
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : hasPending ? (
          <Ionicons name="cloud-upload-outline" size={20} color={colors.warning} />
        ) : (
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.statusRow}>
        <View style={styles.statusInfo}>
          {isSyncing ? (
            <>
              <ActivityIndicator size="small" color={colors.primary} style={styles.icon} />
              <Text style={[styles.statusText, { color: colors.textPrimary }]}>Syncing...</Text>
            </>
          ) : hasPending || backgroundSyncError ? (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color={colors.warning} style={styles.icon} />
              <Text style={[styles.statusText, { color: colors.warning }]}>
                {backgroundSyncError ? 'Saved locally; sync pending' : 'Pending changes'}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} style={styles.icon} />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>Synced</Text>
            </>
          )}
        </View>

        {!isSyncing && (
          <TouchableOpacity
            onPress={handleSync}
            style={[styles.syncButton, { backgroundColor: colors.primary }]}
            accessible={true}
            accessibilityLabel="Sync now"
            accessibilityRole="button"
          >
            <Text style={[styles.syncButtonText, { color: colors.background }]}>Sync</Text>
          </TouchableOpacity>
        )}
      </View>

      {lastSyncTime && !hasPending && (
        <Text style={[styles.lastSync, { color: colors.textMuted }]}>
          Last synced: {formatLastSync()}
        </Text>
      )}

      {displayError && (
        <View style={styles.errorContainer}>
          <Text style={[styles.error, { color: colors.error }]}>
            {displayError}
          </Text>
          {backgroundSyncError && (
            <TouchableOpacity
              onPress={handleSync}
              style={styles.retryButton}
              accessible={true}
              accessibilityLabel="Retry sync"
              accessibilityRole="button"
            >
              <Text style={[styles.retryButtonText, { color: colors.primary }]}>Tap to retry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
  },
  compactContainer: {
    padding: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  syncButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  syncButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  lastSync: {
    fontSize: 12,
    marginTop: 4,
  },
  errorContainer: {
    marginTop: 4,
  },
  error: {
    fontSize: 12,
  },
  retryButton: {
    marginTop: 4,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
