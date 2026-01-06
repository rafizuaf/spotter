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
      style={styles.routineCard}
      onPress={() => handleRoutinePress(item)}
    >
      <View style={styles.routineInfo}>
        <Text style={styles.routineName}>{item.name}</Text>
        <Text style={styles.routineExercises}>
          {item.exerciseCount} {item.exerciseCount === 1 ? 'exercise' : 'exercises'}
        </Text>
      </View>
      <Text style={styles.routineArrow}>→</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {routines.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No Routines Yet</Text>
          <Text style={styles.emptySubtext}>
            Create a routine to organize your workouts
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setIsModalVisible(true)}
          >
            <Text style={styles.createButtonText}>Create Routine</Text>
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
                tintColor="#6366f1"
                colors={['#6366f1']}
              />
            }
          />
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setIsModalVisible(true)}
          >
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </>
      )}

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Routine</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Routine name"
              placeholderTextColor="#64748b"
              value={newRoutineName}
              onChangeText={setNewRoutineName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setNewRoutineName('');
                  setIsModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCreate}
                onPress={createRoutine}
              >
                <Text style={styles.modalCreateText}>Create</Text>
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
    backgroundColor: '#0f172a',
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
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 32,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  routineCard: {
    backgroundColor: '#1e293b',
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
    color: '#fff',
  },
  routineExercises: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  routineArrow: {
    fontSize: 20,
    color: '#64748b',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
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
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCreate: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  modalCreateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
