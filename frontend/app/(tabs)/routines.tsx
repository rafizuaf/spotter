import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { database, routinesCollection } from '../../src/db';
import { useAuthStore } from '../../src/stores/authStore';
import { v4 as uuid } from 'uuid';
import type Routine from '../../src/db/models/Routine';
import { useTheme } from '../../src/hooks/useTheme';
import { withOpacity } from '@/utils/colors';

interface RoutineWithStats {
  id: string;
  serverId: string;
  name: string;
  notes?: string;
  exerciseCount: number;
}

export default function RoutinesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const colors = useTheme();
  const [routines, setRoutines] = useState<RoutineWithStats[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRoutines();

    // Subscribe to routine changes
    const subscription = routinesCollection
      .query(
        Q.where('user_id', user?.id || ''),
        Q.where('deleted_at', null),
        Q.sortBy('created_at', Q.desc)
      )
      .observe()
      .subscribe(() => {
        loadRoutines();
      });

    return () => subscription.unsubscribe();
  }, [user?.id]);

  const loadRoutines = async () => {
    try {
      if (!user?.id) {
        setRoutines([]);
        setLoading(false);
        return;
      }

      const routineRecords = await routinesCollection
        .query(
          Q.where('user_id', user.id),
          Q.where('deleted_at', null),
          Q.sortBy('created_at', Q.desc)
        )
        .fetch();

      // Get exercise count for each routine
      const routinesWithStats = await Promise.all(
        routineRecords.map(async (routine: Routine) => {
          const exercises = await routine.routineExercises.fetch();
          const activeExercises = exercises.filter((e: { deletedAt?: Date | null }) => !e.deletedAt);

          return {
            id: routine.id,
            serverId: routine.serverId,
            name: routine.name,
            notes: routine.notes,
            exerciseCount: activeExercises.length,
          };
        })
      );

      setRoutines(routinesWithStats);
    } catch (error) {
      console.error('Error loading routines:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const createRoutine = async () => {
    if (!newRoutineName.trim() || !user?.id) return;

    try {
      await database.write(async () => {
        await routinesCollection.create((routine: Routine) => {
          routine.serverId = uuid();
          routine.userId = user.id;
          routine.name = newRoutineName.trim();
          routine.isPublic = false;
        });
      });

      setNewRoutineName('');
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error creating routine:', error);
    }
  };

  const handleRoutinePress = (routine: RoutineWithStats) => {
    // Navigate to routine detail screen
    router.push(`/(tabs)/routines?id=${routine.serverId}`);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRoutines();
  };

  const renderRoutine = ({ item }: { item: RoutineWithStats }) => (
    <TouchableOpacity
      style={[styles.routineCard, { backgroundColor: colors.surface }]}
      onPress={() => handleRoutinePress(item)}
    >
      <View style={styles.routineInfo}>
        <Text style={[styles.routineName, { color: colors.textPrimary }]}>{item.name}</Text>
        <Text style={[styles.routineExercises, { color: colors.textSecondary }]}>
          {item.exerciseCount} {item.exerciseCount === 1 ? 'exercise' : 'exercises'}
        </Text>
      </View>
      <Text style={[styles.routineArrow, { color: colors.textMuted }]}>→</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {routines.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Routines Yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Create a routine to organize your workouts
          </Text>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={() => setIsModalVisible(true)}
          >
            <Text style={[styles.createButtonText, { color: colors.background }]}>Create Routine</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={routines}
            renderItem={renderRoutine}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          />
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }]}
            onPress={() => setIsModalVisible(true)}
          >
            <Text style={[styles.fabText, { color: colors.background }]}>+</Text>
          </TouchableOpacity>
        </>
      )}

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: withOpacity(colors.black, 0.7) }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>New Routine</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceElevated, color: colors.textPrimary }]}
              placeholder="Routine name"
              placeholderTextColor={colors.textMuted}
              value={newRoutineName}
              onChangeText={setNewRoutineName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancel, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => {
                  setNewRoutineName('');
                  setIsModalVisible(false);
                }}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreate, { backgroundColor: colors.primary }]}
                onPress={createRoutine}
              >
                <Text style={[styles.modalCreateText, { color: colors.background }]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 32,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  routineCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    fontSize: 18,
    fontWeight: '600',
  },
  routineExercises: {
    fontSize: 14,
    marginTop: 4,
  },
  routineArrow: {
    fontSize: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 32,
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalCreate: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCreateText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
