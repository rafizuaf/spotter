import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.user_metadata?.username?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.username}>
          @{user?.user_metadata?.username || 'User'}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>1</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Total XP</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>PRs</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={styles.emptyBadges}>
          <Text style={styles.emptyText}>No badges earned yet</Text>
          <Text style={styles.emptySubtext}>
            Complete workouts to unlock achievements
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Edit Profile</Text>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Units & Preferences</Text>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Notifications</Text>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Privacy</Text>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Spotter v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  email: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  section: {
    padding: 24,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  emptyBadges: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  settingItem: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  settingArrow: {
    fontSize: 18,
    color: '#64748b',
  },
  logoutButton: {
    backgroundColor: '#7f1d1d',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fecaca',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
  },
});
