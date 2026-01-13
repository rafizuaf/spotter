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
import { useTheme } from '../../src/hooks/useTheme';

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
  const colors = useTheme();
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
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
          Control who can see your workouts by default. You can change visibility for individual
          workouts when you complete them.
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Default Workout Visibility</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {VISIBILITY_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionRow,
                  index > 0 && { borderTopColor: colors.border },
                ]}
                onPress={() => setVisibility(option.value)}
              >
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{option.label}</Text>
                  <Text style={[styles.optionDescription, { color: colors.textMuted }]}>{option.description}</Text>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    { borderColor: colors.textMuted },
                    visibility === option.value && { borderColor: colors.primary },
                  ]}
                >
                  {visibility === option.value && (
                    <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.surfaceElevated }]}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
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
    lineHeight: 20,
  },
  section: {
    padding: 16,
    paddingTop: 0,
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
    padding: 16,
    borderTopWidth: 1,
  },
  optionContent: {
    flex: 1,
    marginRight: 16,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  infoBox: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
