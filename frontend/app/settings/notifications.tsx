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

interface NotificationPreferences {
  follows: boolean;
  achievements: boolean;
  prs: boolean;
  levelUp: boolean;
  reminders: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  follows: true,
  achievements: true,
  prs: true,
  levelUp: true,
  reminders: true,
};

export default function NotificationSettingsScreen() {
  const { user } = useAuthStore();
  const colors = useTheme();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
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

        const savedPrefs = record.notificationPreferences as Partial<NotificationPreferences> | null;
        if (savedPrefs) {
          setPreferences({ ...DEFAULT_PREFERENCES, ...savedPrefs });
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user || !settings) return;

    setSaving(true);
    try {
      await database.write(async () => {
        await settings.update((record) => {
          record.notificationPreferences = preferences as unknown as Record<string, unknown>;
        });
      });

      await syncDatabase();
      Alert.alert('Success', 'Notification preferences saved');
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
          title: 'Notifications',
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
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Choose which notifications you'd like to receive
        </Text>

        {/* Social notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Social</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>New Followers</Text>
                <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                  When someone starts following you
                </Text>
              </View>
              <Switch
                value={preferences.follows}
                onValueChange={(value) => updatePreference('follows', value)}
                trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Achievement notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Achievements</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Badges</Text>
                <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                  When you unlock a new badge
                </Text>
              </View>
              <Switch
                value={preferences.achievements}
                onValueChange={(value) => updatePreference('achievements', value)}
                trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={[styles.switchRow, { borderTopColor: colors.border }]}>
              <View style={styles.switchLabel}>
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Personal Records</Text>
                <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                  When you hit a new PR
                </Text>
              </View>
              <Switch
                value={preferences.prs}
                onValueChange={(value) => updatePreference('prs', value)}
                trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={[styles.switchRow, { borderTopColor: colors.border }]}>
              <View style={styles.switchLabel}>
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Level Up</Text>
                <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                  When you reach a new level
                </Text>
              </View>
              <Switch
                value={preferences.levelUp}
                onValueChange={(value) => updatePreference('levelUp', value)}
                trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Reminder notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Reminders</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Workout Reminders</Text>
                <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                  Remind you to work out
                </Text>
              </View>
              <Switch
                value={preferences.reminders}
                onValueChange={(value) => updatePreference('reminders', value)}
                trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
                thumbColor={colors.white}
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
  description: {
    fontSize: 14,
    padding: 16,
    paddingBottom: 8,
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
  optionLabel: {
    fontSize: 16,
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 2,
  },
});
