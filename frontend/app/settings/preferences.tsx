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
import { useTheme } from '../../src/hooks/useTheme';

type WeightUnit = 'kg' | 'lbs';
type DistanceUnit = 'km' | 'miles';

// Rest time presets in seconds
const REST_TIME_OPTIONS = [
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '2m', value: 120 },
  { label: '3m', value: 180 },
];

export default function PreferencesSettingsScreen() {
  const { user } = useAuthStore();
  const colors = useTheme();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('km');
  const [keepScreenAwake, setKeepScreenAwake] = useState(true);
  const [timerEnabled, setTimerEnabled] = useState(true); // C4: Timer On/Off
  const [timerAutoStart, setTimerAutoStart] = useState(true);
  const [timerVibration, setTimerVibration] = useState(true);
  const [timerSound, setTimerSound] = useState(true);
  const [defaultRestTime, setDefaultRestTime] = useState(90);
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
        setTimerEnabled(record.timerEnabled ?? true); // C4: Timer enabled by default
        setTimerAutoStart(record.timerAutoStart ?? true);
        setTimerVibration(record.timerVibrationEnabled ?? true);
        setTimerSound(record.timerSoundEnabled ?? true);
        setDefaultRestTime(record.defaultRestTimeSeconds ?? 90);
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
          record.timerEnabled = timerEnabled; // C4: Timer On/Off
          record.timerAutoStart = timerAutoStart;
          record.timerVibrationEnabled = timerVibration;
          record.timerSoundEnabled = timerSound;
          record.defaultRestTimeSeconds = defaultRestTime;
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
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
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.saveButton, { color: colors.primary }]}>Save</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Units Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Units</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.optionRow}>
              <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Weight</Text>
              <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceElevated }]}>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    weightUnit === 'kg' && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setWeightUnit('kg')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: colors.textSecondary },
                      weightUnit === 'kg' && { color: colors.background },
                    ]}
                  >
                    kg
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    weightUnit === 'lbs' && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setWeightUnit('lbs')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: colors.textSecondary },
                      weightUnit === 'lbs' && { color: colors.background },
                    ]}
                  >
                    lbs
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.optionRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Distance</Text>
              <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceElevated }]}>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    distanceUnit === 'km' && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setDistanceUnit('km')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: colors.textSecondary },
                      distanceUnit === 'km' && { color: colors.background },
                    ]}
                  >
                    km
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    distanceUnit === 'miles' && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setDistanceUnit('miles')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: colors.textSecondary },
                      distanceUnit === 'miles' && { color: colors.background },
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
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Workout</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Keep Screen Awake</Text>
                <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                  Prevent screen from sleeping during workouts
                </Text>
              </View>
              <Switch
                value={keepScreenAwake}
                onValueChange={setKeepScreenAwake}
                trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* C4: Rest Timer Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Rest Timer</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Rest Timer</Text>
                <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                  Enable rest timer during workouts
                </Text>
              </View>
              <Switch
                value={timerEnabled}
                onValueChange={(value) => {
                  setTimerEnabled(value);
                  // C4: If disabling timer, also disable auto-start
                  if (!value) {
                    setTimerAutoStart(false);
                  }
                }}
                trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            {timerEnabled && (
              <View style={[styles.switchRow, { borderTopColor: colors.border }]}>
                <View style={styles.switchLabel}>
                  <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Auto-start After Set</Text>
                  <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                    Automatically start timer after logging a set
                  </Text>
                </View>
                <Switch
                  value={timerAutoStart}
                  onValueChange={setTimerAutoStart}
                  trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>
            )}
          </View>
        </View>

        {/* Timer Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Timer Alerts</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Vibration</Text>
                <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                  Vibrate when timer completes
                </Text>
              </View>
              <Switch
                value={timerVibration}
                onValueChange={setTimerVibration}
                trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={[styles.switchRow, { borderTopColor: colors.border }]}>
              <View style={styles.switchLabel}>
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Sound</Text>
                <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                  Play sound when timer completes
                </Text>
              </View>
              <Switch
                value={timerSound}
                onValueChange={setTimerSound}
                trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Default Rest Time Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Default Rest Time</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.restTimeContainer}>
              {REST_TIME_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.restTimeButton,
                    { backgroundColor: colors.surfaceElevated },
                    defaultRestTime === option.value && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setDefaultRestTime(option.value)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Set default rest time to ${option.label}`}
                  accessibilityState={{ selected: defaultRestTime === option.value }}
                >
                  <Text
                    style={[
                      styles.restTimeButtonText,
                      { color: colors.textSecondary },
                      defaultRestTime === option.value && { color: colors.background },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.restTimeHint, { color: colors.textMuted }]}>
              Timer will start with this duration after completing a set
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  section: {
    padding: 16,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
  },
  optionLabel: {
    fontSize: 16,
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
  },
  segment: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  restTimeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  restTimeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  restTimeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  restTimeHint: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});
