import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import {
  parseRankingBadge,
  getRankingBadgeIcon,
} from '../services/rankings';

export interface RankingBadgeProps {
  achievementCode: string;
  title: string;
  description: string;
  earnedAt?: Date;
  isRusty?: boolean;
}

export default function RankingBadge({
  achievementCode,
  title,
  description,
  earnedAt,
  isRusty = false,
}: RankingBadgeProps) {
  const colors = useTheme();
  const parsed = parseRankingBadge(achievementCode);
  const icon = parsed ? getRankingBadgeIcon(parsed.threshold) : { emoji: '🏅', color: '#a0a0a0', label: 'Top %' };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface },
        isRusty && { opacity: 0.6, borderWidth: 1, borderColor: colors.error },
      ]}
      accessible
      accessibilityLabel={`${title}. ${description}. ${isRusty ? 'Rusty badge.' : ''}`}
      accessibilityRole="none"
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.surfaceElevated }]}>
        <Text style={styles.icon}>{icon.emoji}</Text>
        <Text style={[styles.topLabel, { color: icon.color }]}>{icon.label}</Text>
        {isRusty && (
          <View
            style={[styles.rustyBadge, { backgroundColor: colors.error }]}
            accessibilityLabel="Rusty badge"
          />
        )}
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
        {earnedAt && (
          <Text style={[styles.earnedText, { color: colors.textMuted }]}>
            Earned {formatDate(earnedAt)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  icon: {
    fontSize: 26,
  },
  topLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  rustyBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 4,
  },
  earnedText: {
    fontSize: 12,
  },
});
