import { View, Text, StyleSheet } from 'react-native';
import colors from '@/utils/colors';

interface LevelProgressProps {
  level: number;
  totalXp: number;
  xpToNextLevel: number;
}

export default function LevelProgress({ level, totalXp, xpToNextLevel }: LevelProgressProps) {
  // Calculate XP for current level
  const xpForCurrentLevel = Math.pow(level - 1, 2) * 100;
  const xpForNextLevel = Math.pow(level, 2) * 100;
  const xpInCurrentLevel = totalXp - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = (xpInCurrentLevel / xpNeededForLevel) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{level}</Text>
        </View>
        <View style={styles.xpInfo}>
          <Text style={styles.levelLabel}>Level {level}</Text>
          <Text style={styles.xpText}>
            {xpInCurrentLevel.toLocaleString()} / {xpNeededForLevel.toLocaleString()} XP
          </Text>
        </View>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(progressPercent, 100)}%` }
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {xpToNextLevel.toLocaleString()} XP to level {level + 1}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  levelText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.background,
  },
  xpInfo: {
    flex: 1,
  },
  levelLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  xpText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  progressBarContainer: {
    marginTop: 4,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
