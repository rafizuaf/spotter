import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { getStrengthLevelColor } from '../utils/strengthCalculations';
import type { StrengthLevel } from '../constants/strengthStandards';
import type { Colors } from '../utils/colors';

interface StrengthLevelBadgeProps {
  /** The strength level to display */
  level: StrengthLevel;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show full level name or abbreviated */
  abbreviated?: boolean;
}

/**
 * StrengthLevelBadge
 *
 * A colored badge displaying the user's strength level classification.
 * Colors are based on level: Untrained (gray) -> Elite (purple)
 */
export default function StrengthLevelBadge({
  level,
  size = 'medium',
  abbreviated = false,
}: StrengthLevelBadgeProps) {
  const colors = useTheme();
  const levelColor = getStrengthLevelColor(level);
  const styles = createStyles(colors, levelColor, size);

  // Abbreviated labels for compact display
  const abbreviatedLabels: Record<StrengthLevel, string> = {
    Untrained: 'UT',
    Beginner: 'BEG',
    Novice: 'NOV',
    Intermediate: 'INT',
    Advanced: 'ADV',
    Elite: 'ELITE',
  };

  const displayText = abbreviated ? abbreviatedLabels[level] : level.toUpperCase();

  return (
    <View
      style={styles.badge}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Strength level: ${level}`}
    >
      <Text style={styles.text}>{displayText}</Text>
    </View>
  );
}

const createStyles = (colors: Colors, levelColor: string, size: 'small' | 'medium' | 'large') => {
  const sizeConfig = {
    small: { paddingH: 6, paddingV: 2, fontSize: 10, borderRadius: 4 },
    medium: { paddingH: 10, paddingV: 4, fontSize: 12, borderRadius: 6 },
    large: { paddingH: 14, paddingV: 6, fontSize: 14, borderRadius: 8 },
  };

  const config = sizeConfig[size];

  return StyleSheet.create({
    badge: {
      backgroundColor: `${levelColor}20`, // 20% opacity background
      borderWidth: 1,
      borderColor: levelColor,
      borderRadius: config.borderRadius,
      paddingHorizontal: config.paddingH,
      paddingVertical: config.paddingV,
      alignSelf: 'flex-start',
    },
    text: {
      color: levelColor,
      fontSize: config.fontSize,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
  });
};
