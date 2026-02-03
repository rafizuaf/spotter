import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { database, routinesCollection, routineExercisesCollection } from '../../src/db';
import { useAuthStore } from '../../src/stores/authStore';
import { v4 as uuid } from 'uuid';
import type Routine from '../../src/db/models/Routine';
import type RoutineExercise from '../../src/db/models/RoutineExercise';
import { useTheme } from '../../src/hooks/useTheme';
import { withOpacity } from '@/utils/colors';
import SegmentedControl from '../../src/components/SegmentedControl';
import { getTier } from '../../src/services/exporters/exportLimits';
import { syncOnDemand } from '../../src/db/sync';
import { logError } from '../../src/utils/errorHandler';
import { Alert } from 'react-native';
import { supabase } from '../../src/services/supabase';

interface RoutineWithStats {
  id: string;
  serverId: string;
  name: string;
  notes?: string;
  exerciseCount: number;
  usageCount?: number; // C7: For public templates
  isPublic?: boolean; // C7: For public templates
}

export default function RoutinesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const colors = useTheme();
  const [routines, setRoutines] = useState<RoutineWithStats[]>([]);
  const [publicTemplates, setPublicTemplates] = useState<RoutineWithStats[]>([]); // C7: Public templates
  const [selectedTab, setSelectedTab] = useState(0); // C7: 0 = My Routines, 1 = Discover
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tier, setTier] = useState<'FREE' | 'PRO' | 'ELITE'>('FREE');

  useEffect(() => {
    if (user?.id) {
      getTier(user.id).then(setTier);
      loadRoutines();
      if (selectedTab === 1) {
        loadPublicTemplates();
      }
    }

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
  }, [user?.id, selectedTab]);

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

  const loadPublicTemplates = async () => {
    // C7: Load public routines (templates) from other users
    try {
      // Sync routines table to get public templates
      await syncOnDemand(['routines']);

      const publicRoutineRecords = await routinesCollection
        .query(
          Q.where('is_public', true),
          Q.where('deleted_at', null),
          Q.sortBy('usage_count', Q.desc), // Sort by popularity
          Q.take(20) // Limit to top 20
        )
        .fetch();

      // Filter out user's own routines
      const templates = publicRoutineRecords.filter(
        (r: Routine) => r.userId !== user?.id
      );

      const templatesWithStats = await Promise.all(
        templates.map(async (routine: Routine) => {
          const exercises = await routine.routineExercises.fetch();
          const activeExercises = exercises.filter((e: { deletedAt?: Date | null }) => !e.deletedAt);

          return {
            id: routine.id,
            serverId: routine.serverId,
            name: routine.name,
            notes: routine.notes,
            exerciseCount: activeExercises.length,
            usageCount: routine.usageCount || 0,
            isPublic: routine.isPublic,
          };
        })
      );

      setPublicTemplates(templatesWithStats);
    } catch (error) {
      logError(error, 'RoutinesScreen_loadPublicTemplates');
    }
  };

  const handleUseTemplate = async (template: RoutineWithStats & { usageCount?: number }) => {
    // C7: Copy template to user's routines (respecting tier limit)
    if (!user?.id) return;

    try {
      // Check tier limit
      const userRoutines = await routinesCollection
        .query(
          Q.where('user_id', user.id),
          Q.where('deleted_at', null)
        )
        .fetch();

      const maxRoutines = tier === 'FREE' ? 3 : tier === 'PRO' ? 10 : Infinity;

      if (userRoutines.length >= maxRoutines) {
        Alert.alert(
          'Limit Reached',
          `${tier} tier allows ${maxRoutines} routines. Upgrade to add more.`
        );
        return;
      }

      // Get template's exercises
      const templateRecord = await routinesCollection
        .query(Q.where('server_id', template.serverId))
        .fetch();

      if (templateRecord.length === 0) {
        Alert.alert('Error', 'Template not found');
        return;
      }

      const templateRoutine = templateRecord[0] as Routine;
      const exercises = await templateRoutine.routineExercises.fetch();
      const activeExercises = exercises.filter((e: { deletedAt?: Date | null }) => !e.deletedAt);

      // Create new routine
      const newRoutineId = uuid();
      await database.write(async () => {
        const newRoutine = await routinesCollection.create((routine: Routine) => {
          routine.serverId = newRoutineId;
          routine.userId = user.id;
          routine.name = `${template.name} (Copy)`;
          routine.notes = template.notes;
          routine.isPublic = false; // User's copy is private by default
          routine.usageCount = 0;
        });

        // Copy exercises
        for (const exercise of activeExercises) {
          const typedExercise = exercise as RoutineExercise;
          await routineExercisesCollection.create((re: RoutineExercise) => {
            re.serverId = uuid();
            re.routineId = newRoutine.id;
            re.exerciseId = typedExercise.exerciseId;
            re.orderIndex = typedExercise.orderIndex;
            re.targetSets = typedExercise.targetSets;
            re.targetReps = typedExercise.targetReps;
          });
        }
      });

      // C7: Increment usage count on server
      try {
        await supabase.functions.invoke('increment-routine-usage', {
          body: { routine_id: template.serverId },
        });
      } catch (error) {
        logError(error, 'RoutinesScreen_incrementUsage');
        // Don't fail if increment fails
      }

      // Sync to push new routine to server
      await syncOnDemand(['routines', 'routine_exercises']);

      Alert.alert('Success', 'Template copied to your routines');
      setSelectedTab(0); // Switch to My Routines tab
      loadRoutines();
    } catch (error) {
      logError(error, 'RoutinesScreen_handleUseTemplate');
      Alert.alert('Error', 'Failed to copy template');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedTab === 0) {
      loadRoutines();
    } else {
      loadPublicTemplates();
    }
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

  const renderTemplate = ({ item }: { item: RoutineWithStats }) => (
    <View style={[styles.templateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.templateInfo}>
        <Text style={[styles.templateName, { color: colors.textPrimary }]}>{item.name}</Text>
        {item.notes && (
          <Text style={[styles.templateNotes, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.notes}
          </Text>
        )}
        <View style={styles.templateStats}>
          <Text style={[styles.templateStat, { color: colors.textSecondary }]}>
            {item.exerciseCount} {item.exerciseCount === 1 ? 'exercise' : 'exercises'}
          </Text>
          {item.usageCount !== undefined && item.usageCount > 0 && (
            <Text style={[styles.templateStat, { color: colors.textMuted }]}>
              {item.usageCount} {item.usageCount === 1 ? 'use' : 'uses'}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.useButton, { backgroundColor: colors.primary }]}
        onPress={() => handleUseTemplate(item)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Use template ${item.name}`}
      >
        <Text style={[styles.useButtonText, { color: colors.background }]}>Use</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* C7: Segmented control for My Routines / Discover */}
      <View style={[styles.segmentedContainer, { backgroundColor: colors.background }]}>
        <SegmentedControl
          values={['My Routines', 'Discover Templates']}
          selectedIndex={selectedTab}
          onChange={setSelectedTab}
        />
      </View>

      {selectedTab === 0 ? (
        // My Routines tab
        routines.length === 0 ? (
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
          <FlashList
            data={routines}
            renderItem={renderRoutine}
            keyExtractor={(item) => item.id}
            estimatedItemSize={100}
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
      ) ) : (
        // Discover Templates tab
        publicTemplates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Templates Found</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Check back later for community templates
            </Text>
          </View>
        ) : (
          <FlashList
            data={publicTemplates}
            renderItem={renderTemplate}
            keyExtractor={(item) => item.id}
            estimatedItemSize={120}
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
        )
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
  segmentedContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  templateInfo: {
    flex: 1,
    marginRight: 12,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  templateNotes: {
    fontSize: 14,
    marginBottom: 8,
  },
  templateStats: {
    flexDirection: 'row',
    gap: 12,
  },
  templateStat: {
    fontSize: 12,
  },
  useButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  useButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
