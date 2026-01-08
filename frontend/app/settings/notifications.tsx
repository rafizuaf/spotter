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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
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
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <Text style={styles.saveButton}>Save</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        <Text style={styles.description}>
          Choose which notifications you'd like to receive
        </Text>

        {/* Social notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.optionLabel}>New Followers</Text>
                <Text style={styles.optionDescription}>
                  When someone starts following you
                </Text>
              </View>
              <Switch
                value={preferences.follows}
                onValueChange={(value) => updatePreference('follows', value)}
                trackColor={{ false: '#334155', true: '#6366f1' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Achievement notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.optionLabel}>Badges</Text>
                <Text style={styles.optionDescription}>
                  When you unlock a new badge
                </Text>
              </View>
              <Switch
                value={preferences.achievements}
                onValueChange={(value) => updatePreference('achievements', value)}
                trackColor={{ false: '#334155', true: '#6366f1' }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.switchRow, styles.optionRowBorder]}>
              <View style={styles.switchLabel}>
                <Text style={styles.optionLabel}>Personal Records</Text>
                <Text style={styles.optionDescription}>
                  When you hit a new PR
                </Text>
              </View>
              <Switch
                value={preferences.prs}
                onValueChange={(value) => updatePreference('prs', value)}
                trackColor={{ false: '#334155', true: '#6366f1' }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.switchRow, styles.optionRowBorder]}>
              <View style={styles.switchLabel}>
                <Text style={styles.optionLabel}>Level Up</Text>
                <Text style={styles.optionDescription}>
                  When you reach a new level
                </Text>
              </View>
              <Switch
                value={preferences.levelUp}
                onValueChange={(value) => updatePreference('levelUp', value)}
                trackColor={{ false: '#334155', true: '#6366f1' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Reminder notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminders</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.optionLabel}>Workout Reminders</Text>
                <Text style={styles.optionDescription}>
                  Remind you to work out
                </Text>
              </View>
              <Switch
                value={preferences.reminders}
                onValueChange={(value) => updatePreference('reminders', value)}
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
  description: {
    fontSize: 14,
    color: '#94a3b8',
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
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
});
