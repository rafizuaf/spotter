import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { useAuthStore } from '../../src/stores/authStore';
import { database, userSettingsCollection } from '../../src/db';
import { syncDatabase } from '../../src/db/sync';
import type UserSettings from '../../src/db/models/UserSettings';

type WeightUnit = 'kg' | 'lbs';
type DistanceUnit = 'km' | 'miles';

export default function PreferencesSettingsScreen() {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('km');
  const [keepScreenAwake, setKeepScreenAwake] = useState(true);
  const [timerAutoStart, setTimerAutoStart] = useState(true);
  const [timerVibration, setTimerVibration] = useState(true);
  const [timerSound, setTimerSound] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const settingsRecords = await userSettingsCollection
        .query(Q.where('user_id', user.id))
        .fetch();

      if (settingsRecords.length > 0) {
        const record = settingsRecords[0] as UserSettings;
        setSettings(record);
        setWeightUnit((record.weightUnitPreference as WeightUnit) || 'kg');
        setDistanceUnit((record.distanceUnitPreference as DistanceUnit) || 'km');
        setKeepScreenAwake(record.keepScreenAwake ?? true);
        setTimerAutoStart(record.timerAutoStart ?? true);
        setTimerVibration(record.timerVibrationEnabled ?? true);
        setTimerSound(record.timerSoundEnabled ?? true);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !settings) return;

    setSaving(true);
    try {
      await database.write(async () => {
        await settings.update((record) => {
          record.weightUnitPreference = weightUnit;
          record.distanceUnitPreference = distanceUnit;
          record.keepScreenAwake = keepScreenAwake;
          record.timerAutoStart = timerAutoStart;
          record.timerVibrationEnabled = timerVibration;
          record.timerSoundEnabled = timerSound;
        });
      });

      await syncDatabase();
      Alert.alert('Success', 'Preferences saved');
      router.back();
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Preferences',
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <Text style={styles.saveButton}>Save</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        {/* Units Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Units</Text>
          <View style={styles.card}>
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Weight</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    weightUnit === 'kg' && styles.segmentActive,
                  ]}
                  onPress={() => setWeightUnit('kg')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      weightUnit === 'kg' && styles.segmentTextActive,
                    ]}
                  >
                    kg
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    weightUnit === 'lbs' && styles.segmentActive,
                  ]}
                  onPress={() => setWeightUnit('lbs')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      weightUnit === 'lbs' && styles.segmentTextActive,
                    ]}
                  >
                    lbs
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.optionRow, styles.optionRowBorder]}>
              <Text style={styles.optionLabel}>Distance</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    distanceUnit === 'km' && styles.segmentActive,
                  ]}
                  onPress={() => setDistanceUnit('km')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      distanceUnit === 'km' && styles.segmentTextActive,
                    ]}
                  >
                    km
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    distanceUnit === 'miles' && styles.segmentActive,
                  ]}
                  onPress={() => setDistanceUnit('miles')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      distanceUnit === 'miles' && styles.segmentTextActive,
                    ]}
                  >
                    miles
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Workout Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.optionLabel}>Keep Screen Awake</Text>
                <Text style={styles.optionDescription}>
                  Prevent screen from sleeping during workouts
                </Text>
              </View>
              <Switch
                value={keepScreenAwake}
                onValueChange={setKeepScreenAwake}
                trackColor={{ false: '#334155', true: '#6366f1' }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.switchRow, styles.optionRowBorder]}>
              <View style={styles.switchLabel}>
                <Text style={styles.optionLabel}>Auto-start Rest Timer</Text>
                <Text style={styles.optionDescription}>
                  Automatically start timer after logging a set
                </Text>
              </View>
              <Switch
                value={timerAutoStart}
                onValueChange={setTimerAutoStart}
                trackColor={{ false: '#334155', true: '#6366f1' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Timer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timer Alerts</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.optionLabel}>Vibration</Text>
                <Text style={styles.optionDescription}>
                  Vibrate when timer completes
                </Text>
              </View>
              <Switch
                value={timerVibration}
                onValueChange={setTimerVibration}
                trackColor={{ false: '#334155', true: '#6366f1' }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.switchRow, styles.optionRowBorder]}>
              <View style={styles.switchLabel}>
                <Text style={styles.optionLabel}>Sound</Text>
                <Text style={styles.optionDescription}>
                  Play sound when timer completes
                </Text>
              </View>
              <Switch
                value={timerSound}
                onValueChange={setTimerSound}
                trackColor={{ false: '#334155', true: '#6366f1' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    marginRight: 8,
  },
  section: {
    padding: 16,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  optionLabel: {
    fontSize: 16,
    color: '#fff',
  },
  optionDescription: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#334155',
    borderRadius: 6,
    overflow: 'hidden',
  },
  segment: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  segmentActive: {
    backgroundColor: '#6366f1',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  segmentTextActive: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
});
