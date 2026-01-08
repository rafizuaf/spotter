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
      console.error('Error following user:', error);
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
      console.error('Error unfollowing user:', error);
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
            <ActivityIndicator size="small" color="#fff" />
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
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
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
    color: '#fff',
  },
  bio: {
    fontSize: 13,
    color: '#94a3b8',
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
    backgroundColor: '#6366f1',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#6366f1',
  },
});
