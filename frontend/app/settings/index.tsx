import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';

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
      <ScrollView style={styles.container}>
        {/* User info header */}
        <View style={styles.userHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.user_metadata?.username as string)?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.username}>@{(user?.user_metadata?.username as string) || 'User'}</Text>
            <Text style={styles.email}>{user?.email || ''}</Text>
          </View>
        </View>

        {/* Settings sections */}
        {SETTINGS_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.route}
                  style={[
                    styles.settingsItem,
                    index < section.items.length - 1 && styles.settingsItemBorder,
                  ]}
                  onPress={() => router.push(item.route as never)}
                >
                  <View style={styles.settingsItemContent}>
                    <Text style={styles.settingsItemLabel}>{item.label}</Text>
                    {item.description && (
                      <Text style={styles.settingsItemDescription}>{item.description}</Text>
                    )}
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        {/* Version info */}
        <Text style={styles.version}>Spotter v1.0.0</Text>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1e293b',
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  email: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingsItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemLabel: {
    fontSize: 16,
    color: '#fff',
  },
  settingsItemDescription: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: '#64748b',
    marginLeft: 8,
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  version: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    marginTop: 24,
  },
  bottomSpacer: {
    height: 40,
  },
});
