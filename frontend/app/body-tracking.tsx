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

export default function BodyTrackingScreen() {
  const { user } = useAuthStore();
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
      <View style={styles.container}>
        <Text style={styles.emptyText}>Please log in to track your body measurements</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Body Tracking',
          headerRight: () => (
            <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
          />
        }
      >
        {/* Metric Selector */}
        <View style={styles.metricSelector}>
          <TouchableOpacity
            style={[
              styles.metricButton,
              selectedMetric === 'weight' && styles.metricButtonActive,
            ]}
            onPress={() => setSelectedMetric('weight')}
          >
            <Text
              style={[
                styles.metricButtonText,
                selectedMetric === 'weight' && styles.metricButtonTextActive,
              ]}
            >
              Weight
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.metricButton,
              selectedMetric === 'bodyFat' && styles.metricButtonActive,
            ]}
            onPress={() => setSelectedMetric('bodyFat')}
          >
            <Text
              style={[
                styles.metricButtonText,
                selectedMetric === 'bodyFat' && styles.metricButtonTextActive,
              ]}
            >
              Body Fat
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chart */}
        <BodyChart logs={logs} metric={selectedMetric} />

        {/* Recent Logs */}
        <Text style={styles.sectionTitle}>Recent Logs</Text>
        {logs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No body logs yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + Add button to log your measurements
            </Text>
          </View>
        ) : (
          logs.slice(0, 10).map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <Text style={styles.logDate}>{formatDate(log.loggedAt)}</Text>
                {log.weightKg && (
                  <Text style={styles.logWeight}>{log.weightKg.toFixed(1)} kg</Text>
                )}
              </View>

              {(log.bodyFatPct || log.waistCm || log.chestCm) && (
                <View style={styles.logDetails}>
                  {log.bodyFatPct && (
                    <View style={styles.logDetail}>
                      <Text style={styles.logDetailLabel}>Body Fat</Text>
                      <Text style={styles.logDetailValue}>{log.bodyFatPct.toFixed(1)}%</Text>
                    </View>
                  )}
                  {log.chestCm && (
                    <View style={styles.logDetail}>
                      <Text style={styles.logDetailLabel}>Chest</Text>
                      <Text style={styles.logDetailValue}>{log.chestCm.toFixed(1)} cm</Text>
                    </View>
                  )}
                  {log.waistCm && (
                    <View style={styles.logDetail}>
                      <Text style={styles.logDetailLabel}>Waist</Text>
                      <Text style={styles.logDetailValue}>{log.waistCm.toFixed(1)} cm</Text>
                    </View>
                  )}
                </View>
              )}

              {(log.bicepLeftCm || log.bicepRightCm) && (
                <View style={styles.logDetails}>
                  {log.bicepLeftCm && (
                    <View style={styles.logDetail}>
                      <Text style={styles.logDetailLabel}>L Bicep</Text>
                      <Text style={styles.logDetailValue}>{log.bicepLeftCm.toFixed(1)} cm</Text>
                    </View>
                  )}
                  {log.bicepRightCm && (
                    <View style={styles.logDetail}>
                      <Text style={styles.logDetailLabel}>R Bicep</Text>
                      <Text style={styles.logDetailValue}>{log.bicepRightCm.toFixed(1)} cm</Text>
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
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Body Log</Text>
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
    backgroundColor: '#0f172a',
    padding: 16,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#6366f1',
    borderRadius: 6,
    marginRight: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  metricSelector: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
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
  metricButtonActive: {
    backgroundColor: '#6366f1',
  },
  metricButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  metricButtonTextActive: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  logCard: {
    backgroundColor: '#1e293b',
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
    color: '#94a3b8',
  },
  logWeight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  logDetails: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
    marginTop: 8,
  },
  logDetail: {
    flex: 1,
  },
  logDetailLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  logDetailValue: {
    fontSize: 14,
    color: '#fff',
  },
  bottomSpacer: {
    height: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalCancel: {
    fontSize: 16,
    color: '#6366f1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  modalPlaceholder: {
    width: 50,
  },
});
