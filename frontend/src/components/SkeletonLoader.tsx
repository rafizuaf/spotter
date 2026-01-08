import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, DimensionValue } from 'react-native';

interface SkeletonLoaderProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Animated skeleton loading placeholder
 */
export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonLoaderProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton placeholder for a workout card
 */
export function WorkoutCardSkeleton() {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <SkeletonLoader width={120} height={18} />
        <SkeletonLoader width={80} height={14} />
      </View>
      <View style={styles.cardStats}>
        <SkeletonLoader width={60} height={14} />
        <SkeletonLoader width={60} height={14} />
        <SkeletonLoader width={60} height={14} />
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for a user list item
 */
export function UserListItemSkeleton() {
  return (
    <View style={styles.userItemContainer}>
      <SkeletonLoader width={48} height={48} borderRadius={24} />
      <View style={styles.userItemContent}>
        <SkeletonLoader width={100} height={16} />
        <SkeletonLoader width={150} height={14} style={{ marginTop: 4 }} />
      </View>
      <SkeletonLoader width={80} height={32} borderRadius={6} />
    </View>
  );
}

/**
 * Skeleton placeholder for a notification card
 */
export function NotificationCardSkeleton() {
  return (
    <View style={styles.notificationContainer}>
      <SkeletonLoader width={40} height={40} borderRadius={20} />
      <View style={styles.notificationContent}>
        <SkeletonLoader width="80%" height={16} />
        <SkeletonLoader width="60%" height={14} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for a social feed post
 */
export function FeedPostSkeleton() {
  return (
    <View style={styles.feedPostContainer}>
      <View style={styles.feedPostHeader}>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <View style={styles.feedPostHeaderContent}>
          <SkeletonLoader width={100} height={14} />
          <SkeletonLoader width={80} height={12} style={{ marginTop: 4 }} />
        </View>
      </View>
      <SkeletonLoader width="100%" height={60} borderRadius={8} style={{ marginTop: 12 }} />
    </View>
  );
}

/**
 * Skeleton list with multiple items
 */
interface SkeletonListProps {
  count?: number;
  ItemComponent: React.ComponentType;
}

export function SkeletonList({ count = 5, ItemComponent }: SkeletonListProps) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <ItemComponent key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#334155',
  },
  cardContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 16,
  },
  userItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  userItemContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  notificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  feedPostContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  feedPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedPostHeaderContent: {
    marginLeft: 12,
  },
});

export default SkeletonLoader;
