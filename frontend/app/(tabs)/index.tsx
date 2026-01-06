import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';

export default function HomeScreen() {
  const { user } = useAuthStore();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back!</Text>
        <Text style={styles.username}>@{user?.user_metadata?.username || 'User'}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>1</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>XP</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.startButton}
        onPress={() => router.push('/(tabs)/workout')}
      >
        <Text style={styles.startButtonText}>Start Workout</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No recent workouts</Text>
          <Text style={styles.emptySubtext}>Start your first workout to see activity here</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Progress</Text>
        <View style={styles.weekContainer}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
            <View key={index} style={styles.dayContainer}>
              <View style={[styles.dayCircle, index === 0 && styles.dayActive]} />
              <Text style={styles.dayLabel}>{day}</Text>
            </View>
          ))}
        </View>
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
    padding: 24,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  username: {
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
  startButton: {
    backgroundColor: '#6366f1',
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  emptyState: {
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
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
  },
  dayContainer: {
    alignItems: 'center',
    gap: 8,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
  },
  dayActive: {
    backgroundColor: '#6366f1',
  },
  dayLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
