import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useTheme } from '../../src/hooks/useTheme';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function HomeScreen() {
  const { user } = useAuthStore();
  const colors = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header} accessible accessibilityRole="header">
        <Text style={[styles.greeting, { color: colors.textPrimary }]}>Welcome back!</Text>
        <Text style={[styles.username, { color: colors.textSecondary }]}>@{user?.user_metadata?.username || 'User'}</Text>
      </View>

      <View style={styles.statsContainer} accessible accessibilityLabel="Your stats: Level 1, 0 XP, 0 Workouts">
        <View style={[styles.statCard, { backgroundColor: colors.surface }]} accessible accessibilityLabel="Level: 1">
          <Text style={[styles.statValue, { color: colors.primary }]}>1</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Level</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]} accessible accessibilityLabel="XP: 0">
          <Text style={[styles.statValue, { color: colors.primary }]}>0</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>XP</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]} accessible accessibilityLabel="Workouts: 0">
          <Text style={[styles.statValue, { color: colors.primary }]}>0</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Workouts</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.startButton, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/(tabs)/workout')}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Start Workout"
        accessibilityHint="Begins a new workout session"
      >
        <Text style={[styles.startButtonText, { color: colors.background }]}>Start Workout</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickLogButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
        onPress={() => router.push('/quick-log')}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Quick Log"
        accessibilityHint="Log workout by tapping muscle groups"
      >
        <Text style={[styles.quickLogButtonText, { color: colors.primary }]}>Quick Log</Text>
        <Text style={[styles.quickLogSubtext, { color: colors.textSecondary }]}>
          Tap muscle groups to log
        </Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} accessibilityRole="header">Recent Activity</Text>
        <View style={[styles.emptyState, { backgroundColor: colors.surface }]} accessible accessibilityLabel="No recent workouts. Start your first workout to see activity here.">
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent workouts</Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Start your first workout to see activity here</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} accessibilityRole="header">Weekly Progress</Text>
        <View style={[styles.weekContainer, { backgroundColor: colors.surface }]}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
            <View
              key={index}
              style={styles.dayContainer}
              accessible
              accessibilityLabel={`${DAY_NAMES[index]}, ${index === 0 ? 'completed' : 'not completed'}`}
            >
              <View style={[
                styles.dayCircle,
                { backgroundColor: colors.surfaceElevated },
                index === 0 && { backgroundColor: colors.primary }
              ]} />
              <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>{day}</Text>
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
  },
  header: {
    padding: 24,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 16,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  startButton: {
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  quickLogButton: {
    marginHorizontal: 24,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
  },
  quickLogButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  quickLogSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  },
  dayLabel: {
    fontSize: 12,
  },
});
