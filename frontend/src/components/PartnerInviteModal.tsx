/**
 * PartnerInviteModal Component
 * Phase 2G: Social & Competition - Workout Partners
 * 
 * Modal for inviting a user to be a workout partner
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { invitePartner } from '../services/workoutPartners';
import { Q } from '@nozbe/watermelondb';
import { usersCollection, followsCollection } from '../db';
import type User from '../db/models/User';
import { useAuthStore } from '../stores/authStore';

interface PartnerInviteModalProps {
  visible: boolean;
  workoutId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PartnerInviteModal({
  visible,
  workoutId,
  onClose,
  onSuccess,
}: PartnerInviteModalProps) {
  const colors = useTheme();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadFollowingUsers();
    }
  }, [visible]);

  const loadFollowingUsers = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Get users the current user follows
      const follows = await followsCollection
        .query(
          Q.where('follower_id', user.id),
          Q.where('deleted_at', null)
        )
        .fetch();

      const followingIds = follows.map((f) => f.followingId);

      if (followingIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Get user details
      const userRecords = await usersCollection
        .query(Q.where('server_id', Q.oneOf(followingIds)))
        .fetch();

      setUsers(userRecords as User[]);
    } catch (error) {
      console.error('Error loading following users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (partnerUserId: string) => {
    setInviting(partnerUserId);
    try {
      await invitePartner(workoutId, partnerUserId);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error inviting partner:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to send invitation. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setInviting(null);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[styles.userRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => handleInvite(item.serverId)}
      disabled={inviting === item.serverId}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={[styles.avatarText, { color: colors.background }]}>
          {item.username.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.username, { color: colors.textPrimary }]}>{item.username}</Text>
        {item.bio && (
          <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.bio}
          </Text>
        )}
      </View>
      {inviting === item.serverId ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Invite Partner</Text>
          <View style={styles.closeButton} />
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search users..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? 'No users found' : 'Follow users to invite them as partners'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  bio: {
    fontSize: 13,
  },
});
