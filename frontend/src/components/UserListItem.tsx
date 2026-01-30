import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../services/supabase';
import { syncDatabase } from '../db/sync';
import { logError } from '../utils/errorHandler';
import colors from '@/utils/colors';

interface UserListItemProps {
  userId: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  isFollowing: boolean;
  isCurrentUser: boolean;
  onFollowChange?: (userId: string, isNowFollowing: boolean) => void;
}

export default function UserListItem({
  userId,
  username,
  avatarUrl,
  bio,
  isFollowing,
  isCurrentUser,
  onFollowChange,
}: UserListItemProps) {
  const [following, setFollowing] = useState(isFollowing);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('follow-user', {
        body: { followingId: userId },
      });

      if (error) throw error;

      if (data?.success || data?.message === 'Already following') {
        setFollowing(true);
        onFollowChange?.(userId, true);
        await syncDatabase();
      }
    } catch (error) {
      logError(error, 'UserListItem_follow');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('unfollow-user', {
        body: { followingId: userId },
      });

      if (error) throw error;

      if (data?.success) {
        setFollowing(false);
        onFollowChange?.(userId, false);
        await syncDatabase();
      }
    } catch (error) {
      logError(error, 'UserListItem_unfollow');
    } finally {
      setLoading(false);
    }
  };

  const navigateToProfile = () => {
    router.push(`/users/${userId}`);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={navigateToProfile}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {username?.[0]?.toUpperCase() || 'U'}
        </Text>
      </View>

      {/* User Info */}
      <View style={styles.userInfo}>
        <Text style={styles.username}>@{username}</Text>
        {bio && (
          <Text style={styles.bio} numberOfLines={1}>
            {bio}
          </Text>
        )}
      </View>

      {/* Follow Button */}
      {!isCurrentUser && (
        <TouchableOpacity
          style={[
            styles.followButton,
            following ? styles.followingButton : styles.notFollowingButton,
          ]}
          onPress={following ? handleUnfollow : handleFollow}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <Text
              style={[
                styles.followButtonText,
                following && styles.followingButtonText,
              ]}
            >
              {following ? 'Following' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bio: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 90,
    alignItems: 'center',
  },
  notFollowingButton: {
    backgroundColor: colors.primary,
  },
  followingButton: {
    backgroundColor: colors.transparent,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  followButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  followingButtonText: {
    color: colors.primary,
  },
});
