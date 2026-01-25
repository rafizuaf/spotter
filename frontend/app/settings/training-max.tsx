/**
 * Phase 2E: Training Max management (Elite only).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';
import { getTier } from '../../src/services/exporters/exportLimits';
import {
  loadTrainingMaxData,
  saveTrainingMax,
  deleteTrainingMax,
  TM_FROM_1RM_RATIO,
} from '../../src/services/trainingMax';
import { syncDatabase } from '../../src/db/sync';
import ExercisePicker from '../../src/components/ExercisePicker';

interface DraftRow {
  exerciseId: string;
  exerciseName: string;
}

export default function TrainingMaxScreen() {
  const colors = useTheme();
  const { user } = useAuthStore();
  const [tier, setTier] = useState<'FREE' | 'PRO' | 'ELITE'>('FREE');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadTrainingMaxData>> | null>(null);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [tmInputs, setTmInputs] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [t, d] = await Promise.all([getTier(user.id), loadTrainingMaxData(user.id)]);
      setTier(t);
      setData(d);
      const initial: Record<string, string> = {};
      for (const [eid, v] of d.trainingMaxes) {
        initial[eid] = String(v.tm);
      }
      setTmInputs(initial);
    } catch (e) {
      console.error('Training max load error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSetFrom1RM = useCallback(
    (exerciseId: string) => {
      const oneRM = data?.best1RMByExercise.get(exerciseId);
      if (oneRM == null || oneRM <= 0) return;
      const tm = Math.round((oneRM * TM_FROM_1RM_RATIO) * 10) / 10;
      setTmInputs((prev) => ({ ...prev, [exerciseId]: String(tm) }));
    },
    [data?.best1RMByExercise]
  );

  const handleSave = useCallback(
    async (exerciseId: string, recordId: string | null) => {
      if (!user) return;
      const raw = tmInputs[exerciseId] ?? '';
      const tm = parseFloat(raw);
      if (Number.isNaN(tm) || tm <= 0 || tm > 1000) {
        Alert.alert('Invalid', 'Enter a valid training max (0–1000 kg).');
        return;
      }
      setSavingId(exerciseId);
      try {
        const oneRM = data?.best1RMByExercise.get(exerciseId) ?? undefined;
        await saveTrainingMax(user.id, exerciseId, tm, oneRM ?? null, recordId);
        await syncDatabase();
        if (recordId) {
          setTmInputs((prev) => ({ ...prev, [exerciseId]: String(tm) }));
        } else {
          setDrafts((prev) => prev.filter((d) => d.exerciseId !== exerciseId));
          setTmInputs((prev) => {
            const next = { ...prev };
            delete next[exerciseId];
            return next;
          });
        }
        await load();
      } catch (e) {
        console.error('Save TM error:', e);
        Alert.alert('Error', 'Failed to save. Please try again.');
      } finally {
        setSavingId(null);
      }
    },
    [user, data?.best1RMByExercise, tmInputs, load]
  );

  const handleDelete = useCallback(
    async (recordId: string, exerciseId: string) => {
      Alert.alert(
        'Remove Training Max',
        'Remove this exercise from your training maxes?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteTrainingMax(recordId);
                await syncDatabase();
                setTmInputs((prev) => {
                  const next = { ...prev };
                  delete next[exerciseId];
                  return next;
                });
                await load();
              } catch (e) {
                console.error('Delete TM error:', e);
                Alert.alert('Error', 'Failed to remove.');
              }
            },
          },
        ]
      );
    },
    [load]
  );

  const handleAddExercise = useCallback((exerciseId: string, exerciseName: string) => {
    if (data?.trainingMaxes.has(exerciseId)) return;
    if (drafts.some((d) => d.exerciseId === exerciseId)) return;
    setDrafts((prev) => [...prev, { exerciseId, exerciseName }]);
    const oneRM = data?.best1RMByExercise.get(exerciseId);
    if (oneRM != null && oneRM > 0) {
      const tm = Math.round((oneRM * TM_FROM_1RM_RATIO) * 10) / 10;
      setTmInputs((prev) => ({ ...prev, [exerciseId]: String(tm) }));
    } else {
      setTmInputs((prev) => ({ ...prev, [exerciseId]: '' }));
    }
    setShowPicker(false);
  }, [data, drafts]);

  const handleCancelDraft = useCallback((exerciseId: string) => {
    setDrafts((prev) => prev.filter((d) => d.exerciseId !== exerciseId));
    setTmInputs((prev) => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
  }, []);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Training Max' }} />
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  if (tier !== 'ELITE') {
    return (
      <>
        <Stack.Screen options={{ title: 'Training Max' }} />
        <View style={[styles.centered, styles.upgrade, { backgroundColor: colors.background }]}>
          <Ionicons name="lock-closed" size={48} color={colors.textMuted} />
          <Text style={[styles.upgradeTitle, { color: colors.textPrimary }]}>
            Elite feature
          </Text>
          <Text style={[styles.upgradeText, { color: colors.textSecondary }]}>
            Training max and percentage-based training are available on Elite. Upgrade to set your
            maxes and use the % calculator in workouts.
          </Text>
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.upgradeButtonText, { color: colors.background }]}>Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const rows: { exerciseId: string; exerciseName: string; recordId: string | null }[] = [];
  if (data) {
    for (const [eid, v] of data.trainingMaxes) {
      rows.push({
        exerciseId: eid,
        exerciseName: data.exerciseNames.get(eid) ?? 'Unknown',
        recordId: v.recordId,
      });
    }
  }
  for (const d of drafts) {
    if (!rows.some((r) => r.exerciseId === d.exerciseId)) {
      rows.push({ exerciseId: d.exerciseId, exerciseName: d.exerciseName, recordId: null });
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Training Max' }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Set your training max (TM) per exercise. Typically 90% of your 1RM. Used for % calculator
          in workouts and built-in programs.
        </Text>

        {rows.map(({ exerciseId, exerciseName, recordId }) => {
          const oneRM = data?.best1RMByExercise.get(exerciseId);
          const val = tmInputs[exerciseId] ?? (recordId ? String(data?.trainingMaxes.get(exerciseId)?.tm ?? '') : '');
          const isDraft = !recordId;
          const saving = savingId === exerciseId;

          return (
            <View
              key={exerciseId}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.exerciseName, { color: colors.textPrimary }]}>{exerciseName}</Text>
              {oneRM != null && oneRM > 0 && (
                <Text style={[styles.sub, { color: colors.textSecondary }]}>
                  Est. 1RM: {oneRM.toFixed(1)} kg
                </Text>
              )}
              <View style={styles.row}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceElevated,
                      color: colors.textPrimary,
                      borderColor: colors.border,
                    },
                  ]}
                  value={val}
                  onChangeText={(t) => setTmInputs((prev) => ({ ...prev, [exerciseId]: t }))}
                  placeholder="TM (kg)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  style={[styles.setFromBtn, { backgroundColor: colors.surfaceElevated }]}
                  onPress={() => handleSetFrom1RM(exerciseId)}
                  disabled={oneRM == null || oneRM <= 0}
                >
                  <Text
                    style={[
                      styles.setFromText,
                      {
                        color:
                          oneRM != null && oneRM > 0 ? colors.primary : colors.textMuted,
                      },
                    ]}
                  >
                    Set from 1RM
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleSave(exerciseId, recordId)}
                  disabled={saving || !val.trim()}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text style={[styles.saveBtnText, { color: colors.background }]}>
                      {isDraft ? 'Save' : 'Update'}
                    </Text>
                  )}
                </TouchableOpacity>
                {isDraft ? (
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => handleCancelDraft(exerciseId)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.deleteBtn, { borderColor: colors.error }]}
                    onPress={() => handleDelete(recordId!, exerciseId)}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                    <Text style={[styles.deleteBtnText, { color: colors.error }]}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowPicker(true)}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
          <Text style={[styles.addBtnText, { color: colors.primary }]}>Add exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      <ExercisePicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelectExercise={(exerciseId, exerciseName) => handleAddExercise(exerciseId, exerciseName)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  upgrade: {},
  upgradeTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  upgradeText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  upgradeButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
  },
  sub: {
    fontSize: 13,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  setFromBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  setFromText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 15,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontSize: 15,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
