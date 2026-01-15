import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface ProgramProgressBarProps {
  daysCompleted: number;
  totalDays: number;
  showWeekMarkers?: boolean;
}

export default function ProgramProgressBar({
  daysCompleted,
  totalDays,
  showWeekMarkers = true,
}: ProgramProgressBarProps) {
  const colors = useTheme();
  const progress = totalDays > 0 ? (daysCompleted / totalDays) * 100 : 0;

  // Calculate week markers (at days 3, 6, 9 for a 12-day program)
  const weekMarkerPositions = showWeekMarkers
    ? [25, 50, 75] // 25%, 50%, 75%
    : [];

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {daysCompleted}/{totalDays} days
        </Text>
        <Text style={[styles.percentText, { color: colors.primary }]}>
          {Math.round(progress)}%
        </Text>
      </View>

      <View style={[styles.progressBarBackground, { backgroundColor: colors.surface }]}>
        <View
          style={[
            styles.progressBarFill,
            { backgroundColor: colors.primary, width: `${progress}%` },
          ]}
        />

        {/* Week markers */}
        {weekMarkerPositions.map((position, index) => (
          <View
            key={index}
            style={[
              styles.weekMarker,
              { left: `${position}%`, backgroundColor: colors.border },
            ]}
          />
        ))}
      </View>

      {showWeekMarkers && (
        <View style={styles.weekLabels}>
          <Text style={[styles.weekLabel, { color: colors.textMuted }]}>Week 1</Text>
          <Text style={[styles.weekLabel, { color: colors.textMuted }]}>Week 2</Text>
          <Text style={[styles.weekLabel, { color: colors.textMuted }]}>Week 3</Text>
          <Text style={[styles.weekLabel, { color: colors.textMuted }]}>Week 4</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  percentText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBarBackground: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  weekMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
  },
  weekLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  weekLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});
