import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { useAuthStore } from '../../src/stores/authStore';
import { database, usersCollection } from '../../src/db';
import { syncDatabase } from '../../src/db/sync';
import type User from '../../src/db/models/User';
import { useTheme } from '../../src/hooks/useTheme';

export default function ProfileSettingsScreen() {
  const { user: authUser } = useAuthStore();
  const colors = useTheme();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [websiteLink, setWebsiteLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [authUser]);

  const loadProfile = async () => {
    if (!authUser) return;

    try {
      const users = await usersCollection
        .query(Q.where('server_id', authUser.id))
        .fetch();

      if (users.length > 0) {
        const userRecord = users[0] as User;
        setUsername(userRecord.username || '');
        setBio(userRecord.bio || '');
        setWebsiteLink(userRecord.websiteLink || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!authUser) return;

    if (!username.trim()) {
      Alert.alert('Required', 'Username is required');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Invalid', 'Username must be at least 3 characters');
      return;
    }

    setSaving(true);
    try {
      const users = await usersCollection
        .query(Q.where('server_id', authUser.id))
        .fetch();

      if (users.length > 0) {
        await database.write(async () => {
          await users[0].update((record) => {
            record.username = username.trim();
            record.bio = bio.trim() || undefined;
            record.websiteLink = websiteLink.trim() || undefined;
          });
        });
      }

      await syncDatabase();
      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
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
          title: 'Edit Profile',
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
        {/* Avatar placeholder */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.background }]}>
              {username?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <TouchableOpacity>
            <Text style={[styles.changeAvatarText, { color: colors.primary }]}>Change Avatar</Text>
          </TouchableOpacity>
        </View>

        {/* Form fields */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary }]}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.textPrimary }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              maxLength={150}
            />
            <Text style={[styles.charCount, { color: colors.textMuted }]}>{bio.length}/150</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Website</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary }]}
              value={websiteLink}
              onChangeText={setWebsiteLink}
              placeholder="https://yourwebsite.com"
              maxLength={200}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
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
  avatarSection: {
    alignItems: 'center',
    padding: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  changeAvatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
});
