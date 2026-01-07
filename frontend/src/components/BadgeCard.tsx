import { View, Text, StyleSheet } from 'react-native';

interface BadgeCardProps {
  title: string;
  description: string;
  earnedAt?: Date;
  isRusty?: boolean;
}

export default function BadgeCard({ title, description, earnedAt, isRusty }: BadgeCardProps) {
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
    <View style={[styles.container, isRusty && styles.rustyContainer]}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>🏆</Text>
        {isRusty && <View style={styles.rustyBadge} />}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {earnedAt && (
          <Text style={styles.earnedText}>
            Earned {formatDate(earnedAt)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rustyContainer: {
    opacity: 0.6,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  icon: {
    fontSize: 28,
  },
  rustyBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  earnedText: {
    fontSize: 12,
    color: '#64748b',
  },
});
