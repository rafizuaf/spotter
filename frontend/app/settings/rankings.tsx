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
import { Stack } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { useAuthStore } from '../../src/stores/authStore';
import { database, userSettingsCollection } from '../../src/db';
import { syncDatabase } from '../../src/db/sync';
import type UserSettings from '../../src/db/models/UserSettings';
import { useTheme } from '../../src/hooks/useTheme';
import ProfileRankings from '../../src/components/ProfileRankings';
import { getUserRankings } from '../../src/services/rankings';
import type { UserRanking } from '../../src/services/rankings';

export default function RankingsSettingsScreen() {
  const { user } = useAuthStore();
  const colors = useTheme();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [showProfileRankings, setShowProfileRankings] = useState(true);
  const [prominentLeaderboardCode, setProminentLeaderboardCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [settingsRecords, userRankings] = await Promise.all([
        userSettingsCollection.query(Q.where('user_id', user.id)).fetch(),
        getUserRankings(user.id),
      ]);
      if (settingsRecords.length > 0) {
        const record = settingsRecords[0] as UserSettings;
        setSettings(record);
        setShowProfileRankings(record.showProfileRankings ?? true);
        setProminentLeaderboardCode(record.prominentRankLeaderboardCode ?? null);
      }
      setRankings(userRankings);
    } catch (error) {
      console.error('Error loading rankings settings:', error);
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
          record.showProfileRankings = showProfileRankings;
          record.prominentRankLeaderboardCode = prominentLeaderboardCode ?? undefined;
        });
      });
      await syncDatabase();
      Alert.alert('Saved', 'Rankings settings updated.');
    } catch (error) {
      console.error('Error saving rankings settings:', error);
      Alert.alert('Error', 'Failed to save settings.');
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

  const pickerOptions: { value: string | null; label: string }[] = [
    { value: null, label: 'None (auto-select best rank)' },
    ...rankings.map((r) => ({ value: r.leaderboardCode, label: r.leaderboardTitle })),
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Rankings',
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
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Profile display</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Show rankings on profile
              </Text>
              <Switch
                value={showProfileRankings}
                onValueChange={setShowProfileRankings}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.background}
                accessibilityLabel="Show rankings on profile"
                accessibilityRole="switch"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            Featured leaderboard
          </Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Choose which leaderboard rank to highlight first on your profile.
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {pickerOptions.map((opt, index) => (
              <TouchableOpacity
                key={opt.value ?? 'none'}
                style={[
                  styles.optionRow,
                  index < pickerOptions.length - 1 && { borderBottomColor: colors.border },
                ]}
                onPress={() => setProminentLeaderboardCode(opt.value)}
                accessible
                accessibilityLabel={opt.label}
                accessibilityRole="button"
                accessibilityState={{ checked: prominentLeaderboardCode === opt.value }}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    { color: colors.textPrimary },
                    prominentLeaderboardCode === opt.value && { color: colors.primary, fontWeight: '600' },
                  ]}
                >
                  {opt.label}
                </Text>
                {prominentLeaderboardCode === opt.value && (
                  <Text style={[styles.check, { color: colors.primary }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {rankings.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Preview</Text>
            <ProfileRankings
              rankings={rankings}
              prominentLeaderboardCode={prominentLeaderboardCode}
            />
          </View>
        )}

        <View style={styles.bottomSpacer} />
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
    paddingHorizontal: 8,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  hint: {
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 16,
    flex: 1,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  optionLabel: {
    fontSize: 16,
    flex: 1,
  },
  check: {
    fontSize: 18,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
