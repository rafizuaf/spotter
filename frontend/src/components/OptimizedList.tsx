import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  FlatListProps,
  StyleSheet,
  View,
  Text,
  RefreshControl,
  ListRenderItem,
} from 'react-native';

interface OptimizedListProps<T> extends Omit<FlatListProps<T>, 'renderItem' | 'keyExtractor'> {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  estimatedItemSize?: number;
}

/**
 * OptimizedList - High-performance list component
 *
 * Features:
 * - Automatic windowing for large lists
 * - Pull-to-refresh support
 * - Memory-efficient rendering
 * - Empty state handling
 * - Memoized callbacks
 */
function OptimizedListInner<T>({
  data,
  renderItem,
  keyExtractor,
  onRefresh,
  isRefreshing = false,
  emptyMessage = 'No items',
  emptyIcon,
  estimatedItemSize = 80,
  ...rest
}: OptimizedListProps<T>) {
  // Memoize the render function to prevent unnecessary re-renders
  const memoizedRenderItem = useCallback(renderItem, [renderItem]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    }
  }, [onRefresh]);

  // Empty state component
  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        {emptyIcon && <Text style={styles.emptyIcon}>{emptyIcon}</Text>}
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    ),
    [emptyMessage, emptyIcon]
  );

  // Performance optimizations
  const getItemLayout = useCallback(
    (_: ArrayLike<T> | null | undefined, index: number) => ({
      length: estimatedItemSize,
      offset: estimatedItemSize * index,
      index,
    }),
    [estimatedItemSize]
  );

  return (
    <FlatList
      data={data}
      renderItem={memoizedRenderItem}
      keyExtractor={keyExtractor}
      ListEmptyComponent={ListEmptyComponent}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        ) : undefined
      }
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={5}
      getItemLayout={estimatedItemSize ? getItemLayout : undefined}
      // Style
      contentContainerStyle={data.length === 0 ? styles.emptyList : undefined}
      {...rest}
    />
  );
}

// Memoize the entire component
export const OptimizedList = React.memo(OptimizedListInner) as typeof OptimizedListInner;

/**
 * MemoizedItem - Wrapper for list items to prevent unnecessary re-renders
 */
interface MemoizedItemProps<T> {
  item: T;
  index: number;
  renderItem: (item: T, index: number) => React.ReactElement;
  isEqual?: (prevItem: T, nextItem: T) => boolean;
}

function MemoizedItemInner<T>({
  item,
  index,
  renderItem,
}: MemoizedItemProps<T>) {
  return renderItem(item, index);
}

export const MemoizedItem = React.memo(MemoizedItemInner, (prev, next) => {
  // Custom comparison for item equality
  if (prev.isEqual) {
    return prev.isEqual(prev.item, next.item);
  }
  // Default: shallow equality
  return prev.item === next.item && prev.index === next.index;
}) as typeof MemoizedItemInner;

/**
 * useListOptimizations - Hook for common list optimizations
 */
export function useListOptimizations<T extends { id: string }>(
  items: T[]
) {
  // Memoize keyExtractor
  const keyExtractor = useCallback((item: T) => item.id, []);

  // Memoize item separator
  const ItemSeparator = useMemo(
    () => () => <View style={styles.separator} />,
    []
  );

  // Get stable reference to items if content is the same
  const stableItems = useMemo(() => items, [JSON.stringify(items.map((i) => i.id))]);

  return {
    keyExtractor,
    ItemSeparator,
    stableItems,
  };
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  emptyList: {
    flexGrow: 1,
  },
  separator: {
    height: 8,
  },
});

export default OptimizedList;
