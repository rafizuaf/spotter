import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useTheme } from '../../src/hooks/useTheme';

interface SettingsItem {
  label: string;
  route: string;
  description?: string;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    title: 'Account',
    items: [
      { label: 'Edit Profile', route: '/settings/profile', description: 'Username, bio, avatar' },
      { label: 'Privacy', route: '/settings/privacy', description: 'Workout visibility' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { label: 'Units & Display', route: '/settings/preferences', description: 'Weight, distance units' },
      { label: 'Notifications', route: '/settings/notifications', description: 'Push notification settings' },
    ],
  },
  {
    title: 'Data',
    items: [
      { label: 'Body Tracking', route: '/body-tracking', description: 'Weight and measurements' },
    ],
  },
];

export default function SettingsScreen() {
  const { logout, user } = useAuthStore();
  const colors = useTheme();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* User info header */}
        <View style={[styles.userHeader, { backgroundColor: colors.surface }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.background }]}>
              {(user?.user_metadata?.username as string)?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.username, { color: colors.textPrimary }]}>@{(user?.user_metadata?.username as string) || 'User'}</Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email || ''}</Text>
          </View>
        </View>

        {/* Settings sections */}
        {SETTINGS_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{section.title}</Text>
            <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.route}
                  style={[
                    styles.settingsItem,
                    index < section.items.length - 1 && { borderBottomColor: colors.border },
                  ]}
                  onPress={() => router.push(item.route as never)}
                >
                  <View style={styles.settingsItemContent}>
                    <Text style={[styles.settingsItemLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                    {item.description && (
                      <Text style={[styles.settingsItemDescription, { color: colors.textMuted }]}>{item.description}</Text>
                    )}
                  </View>
                  <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout button */}
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.surface }]} onPress={handleLogout}>
          <Text style={[styles.logoutButtonText, { color: colors.error }]}>Logout</Text>
        </TouchableOpacity>

        {/* Version info */}
        <Text style={[styles.version, { color: colors.textMuted }]}>Spotter v1.0.0</Text>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
  },
  email: {
    fontSize: 14,
    marginTop: 2,
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
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemLabel: {
    fontSize: 16,
  },
  settingsItemDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    marginLeft: 8,
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
  bottomSpacer: {
    height: 40,
  },
});
