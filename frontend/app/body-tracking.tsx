import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { useAuthStore } from '../src/stores/authStore';
import { database, userBodyLogsCollection } from '../src/db';
import { syncDatabase } from '../src/db/sync';
import BodyLogForm from '../src/components/BodyLogForm';
import BodyChart from '../src/components/BodyChart';
import type UserBodyLog from '../src/db/models/UserBodyLog';
import { useTheme } from '../src/hooks/useTheme';

export default function BodyTrackingScreen() {
  const { user } = useAuthStore();
  const colors = useTheme();
  const [logs, setLogs] = useState<UserBodyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'weight' | 'bodyFat'>('weight');

  useEffect(() => {
    if (!user) return;

    const subscription = userBodyLogsCollection
      .query(
        Q.where('user_id', user.id),
        Q.where('deleted_at', null),
        Q.sortBy('logged_at', Q.desc)
      )
      .observe()
      .subscribe((bodyLogs) => {
        setLogs(bodyLogs);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncDatabase();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatMeasurement = (value: number | undefined, unit: string): string => {
    if (value === undefined || value === null) return '-';
    return `${value.toFixed(1)} ${unit}`;
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textPrimary }]}>Please log in to track your body measurements</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Body Tracking',
          headerRight: () => (
            <TouchableOpacity onPress={() => setShowForm(true)} style={[styles.addButton, { backgroundColor: colors.primary }]}>
              <Text style={[styles.addButtonText, { color: colors.background }]}>+ Add</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Metric Selector */}
        <View style={[styles.metricSelector, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[
              styles.metricButton,
              selectedMetric === 'weight' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setSelectedMetric('weight')}
          >
            <Text
              style={[
                styles.metricButtonText,
                { color: colors.textSecondary },
                selectedMetric === 'weight' && { color: colors.background },
              ]}
            >
              Weight
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.metricButton,
              selectedMetric === 'bodyFat' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setSelectedMetric('bodyFat')}
          >
            <Text
              style={[
                styles.metricButtonText,
                { color: colors.textSecondary },
                selectedMetric === 'bodyFat' && { color: colors.background },
              ]}
            >
              Body Fat
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chart */}
        <BodyChart logs={logs} metric={selectedMetric} />

        {/* Recent Logs */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Logs</Text>
        {logs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textPrimary }]}>No body logs yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Tap the + Add button to log your measurements
            </Text>
          </View>
        ) : (
          logs.slice(0, 10).map((log) => (
            <View key={log.id} style={[styles.logCard, { backgroundColor: colors.surface }]}>
              <View style={styles.logHeader}>
                <Text style={[styles.logDate, { color: colors.textSecondary }]}>{formatDate(log.loggedAt)}</Text>
                {log.weightKg && (
                  <Text style={[styles.logWeight, { color: colors.primary }]}>{log.weightKg.toFixed(1)} kg</Text>
                )}
              </View>

              {(log.bodyFatPct || log.waistCm || log.chestCm) && (
                <View style={[styles.logDetails, { borderTopColor: colors.border }]}>
                  {log.bodyFatPct && (
                    <View style={styles.logDetail}>
                      <Text style={[styles.logDetailLabel, { color: colors.textMuted }]}>Body Fat</Text>
                      <Text style={[styles.logDetailValue, { color: colors.textPrimary }]}>{log.bodyFatPct.toFixed(1)}%</Text>
                    </View>
                  )}
                  {log.chestCm && (
                    <View style={styles.logDetail}>
                      <Text style={[styles.logDetailLabel, { color: colors.textMuted }]}>Chest</Text>
                      <Text style={[styles.logDetailValue, { color: colors.textPrimary }]}>{log.chestCm.toFixed(1)} cm</Text>
                    </View>
                  )}
                  {log.waistCm && (
                    <View style={styles.logDetail}>
                      <Text style={[styles.logDetailLabel, { color: colors.textMuted }]}>Waist</Text>
                      <Text style={[styles.logDetailValue, { color: colors.textPrimary }]}>{log.waistCm.toFixed(1)} cm</Text>
                    </View>
                  )}
                </View>
              )}

              {(log.bicepLeftCm || log.bicepRightCm) && (
                <View style={[styles.logDetails, { borderTopColor: colors.border }]}>
                  {log.bicepLeftCm && (
                    <View style={styles.logDetail}>
                      <Text style={[styles.logDetailLabel, { color: colors.textMuted }]}>L Bicep</Text>
                      <Text style={[styles.logDetailValue, { color: colors.textPrimary }]}>{log.bicepLeftCm.toFixed(1)} cm</Text>
                    </View>
                  )}
                  {log.bicepRightCm && (
                    <View style={styles.logDetail}>
                      <Text style={[styles.logDetailLabel, { color: colors.textMuted }]}>R Bicep</Text>
                      <Text style={[styles.logDetailValue, { color: colors.textPrimary }]}>{log.bicepRightCm.toFixed(1)} cm</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Add Log Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.surface }]}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={[styles.modalCancel, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>New Body Log</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          <BodyLogForm
            userId={user.id}
            onSuccess={handleFormSuccess}
            onCancel={() => setShowForm(false)}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  metricButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  metricButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyCard: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  logCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logDate: {
    fontSize: 14,
  },
  logWeight: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  logDetails: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 8,
  },
  logDetail: {
    flex: 1,
  },
  logDetailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  logDetailValue: {
    fontSize: 14,
  },
  bottomSpacer: {
    height: 40,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalPlaceholder: {
    width: 50,
  },
});
