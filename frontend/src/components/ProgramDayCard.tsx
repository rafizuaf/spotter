import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export type DayStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'current';

interface ProgramDayCardProps {
  dayNumber: number;
  weekNumber: number;
  title: string;
  status: DayStatus;
  onPress: () => void;
  disabled?: boolean;
}

export default function ProgramDayCard({
  dayNumber,
  weekNumber,
  title,
  status,
  onPress,
  disabled = false,
}: ProgramDayCardProps) {
  const colors = useTheme();

  const getStatusStyles = () => {
    switch (status) {
      case 'completed':
        return {
          borderColor: colors.success,
          iconBg: colors.success,
          icon: '✓',
        };
      case 'skipped':
        return {
          borderColor: colors.textMuted,
          iconBg: colors.textMuted,
          icon: '—',
        };
      case 'current':
        return {
          borderColor: colors.primary,
          iconBg: colors.primary,
          icon: '▶',
        };
      case 'in_progress':
        return {
          borderColor: colors.warning,
          iconBg: colors.warning,
          icon: '◐',
        };
      default:
        return {
          borderColor: colors.border,
          iconBg: colors.surface,
          icon: dayNumber.toString(),
        };
    }
  };

  const statusStyles = getStatusStyles();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: statusStyles.borderColor },
        status === 'current' && styles.currentCard,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessible={true}
      accessibilityLabel={`Day ${dayNumber}, Week ${weekNumber}: ${title}. Status: ${status}`}
      accessibilityRole="button"
    >
      <View style={[styles.dayIndicator, { backgroundColor: statusStyles.iconBg }]}>
        <Text style={[styles.dayIndicatorText, { color: colors.background }]}>
          {statusStyles.icon}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.weekLabel, { color: colors.textMuted }]}>
          Week {weekNumber}
        </Text>
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {status === 'current' && (
        <View style={[styles.startBadge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.startBadgeText, { color: colors.background }]}>
            START
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 8,
  },
  currentCard: {
    borderWidth: 2,
  },
  disabled: {
    opacity: 0.5,
  },
  dayIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dayIndicatorText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  startBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  startBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
