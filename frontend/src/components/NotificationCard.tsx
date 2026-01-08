import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { NotificationType } from '../db/models/Notification';

interface NotificationCardProps {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  actorUsername?: string;
  isRead: boolean;
  createdAt: Date;
  onPress: (id: string) => void;
}

// Icon mapping for notification types
const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case 'FOLLOW':
      return '👤';
    case 'PR':
      return '🏆';
    case 'ACHIEVEMENT':
      return '🎖️';
    case 'LEVEL_UP':
      return '⬆️';
    case 'STREAK':
      return '🔥';
    case 'LIKE':
      return '❤️';
    case 'COMMENT':
      return '💬';
    case 'SYSTEM':
    default:
      return '📢';
  }
};

export default function NotificationCard({
  id,
  type,
  title,
  body,
  isRead,
  createdAt,
  onPress,
}: NotificationCardProps) {
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      style={[styles.container, !isRead && styles.unreadContainer]}
      onPress={() => onPress(id)}
      activeOpacity={0.7}
    >
      {/* Unread indicator */}
      {!isRead && <View style={styles.unreadDot} />}

      {/* Icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{getNotificationIcon(type)}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {body && (
          <Text style={styles.body} numberOfLines={2}>
            {body}
          </Text>
        )}
        <Text style={styles.timestamp}>{formatDate(createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    position: 'relative',
  },
  unreadContainer: {
    backgroundColor: '#1e3a5f',
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 22,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    color: '#64748b',
  },
});
