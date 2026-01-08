import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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

type Visibility = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';

interface VisibilityOption {
  value: Visibility;
  label: string;
  description: string;
}

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  {
    value: 'PUBLIC',
    label: 'Public',
    description: 'Anyone can see your workouts',
  },
  {
    value: 'FOLLOWERS',
    label: 'Followers Only',
    description: 'Only people who follow you can see your workouts',
  },
  {
    value: 'PRIVATE',
    label: 'Private',
    description: 'Only you can see your workouts',
  },
];

export default function PrivacySettingsScreen() {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [visibility, setVisibility] = useState<Visibility>('FOLLOWERS');
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
        setVisibility((record.defaultWorkoutVisibility as Visibility) || 'FOLLOWERS');
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
          record.defaultWorkoutVisibility = visibility;
        });
      });

      await syncDatabase();
      Alert.alert('Success', 'Privacy settings saved');
      router.back();
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
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
          title: 'Privacy',
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
          Control who can see your workouts by default. You can change visibility for individual
          workouts when you complete them.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Default Workout Visibility</Text>
          <View style={styles.card}>
            {VISIBILITY_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionRow,
                  index > 0 && styles.optionRowBorder,
                ]}
                onPress={() => setVisibility(option.value)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    visibility === option.value && styles.radioOuterSelected,
                  ]}
                >
                  {visibility === option.value && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Note: Even with public visibility, your workouts will never be shown to users
            you've blocked.
          </Text>
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
    lineHeight: 20,
  },
  section: {
    padding: 16,
    paddingTop: 0,
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
    padding: 16,
  },
  optionRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  optionContent: {
    flex: 1,
    marginRight: 16,
  },
  optionLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#6366f1',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366f1',
  },
  infoBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#1e3a5f',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
});
