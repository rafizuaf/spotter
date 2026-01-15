import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useTheme } from '../../src/hooks/useTheme';
import { database } from '../../src/db';
import { userSettingsCollection } from '../../src/db';
import { Q } from '@nozbe/watermelondb';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../src/services/supabase';

type OnboardingPersona = 'NEWBIE' | 'CASUAL' | 'REGULAR' | 'DEDICATED' | null;
type WeightUnit = 'KG' | 'LBS';

export default function OnboardingScreen() {
  const { user } = useAuthStore();
  const colors = useTheme();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('KG');
  const [persona, setPersona] = useState<OnboardingPersona>(null);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    // Pre-fill name from user metadata if available
    if (user?.user_metadata?.username) {
      setName(user.user_metadata.username);
    }
  }, [user]);

  const saveSettings = async () => {
    if (!user) return;

    // Get or create user settings
    const existingSettings = await userSettingsCollection
      .query(Q.where('user_id', user.id))
      .fetch();

    await database.write(async () => {
      if (existingSettings.length > 0) {
        const settings = existingSettings[0];
        await settings.update((s) => {
          s.onboardingCompleted = true;
          s.onboardingPersona = persona || undefined;
          s.workoutMode = persona === 'NEWBIE' || persona === 'CASUAL' ? 'SIMPLE' : 'FULL';
          s.weightUnitPreference = weightUnit;
          s.updatedAt = new Date();
        });
      } else {
        // Create new settings
        await userSettingsCollection.create((s) => {
          s.serverId = uuidv4();
          s.userId = user.id;
          s.onboardingCompleted = true;
          s.onboardingPersona = persona || undefined;
          s.workoutMode = persona === 'NEWBIE' || persona === 'CASUAL' ? 'SIMPLE' : 'FULL';
          s.weightUnitPreference = weightUnit;
          s.distanceUnitPreference = 'KM';
          s.themePreference = 'system';
          s.keepScreenAwake = true;
          s.timerAutoStart = true;
          s.timerVibrationEnabled = true;
          s.timerSoundEnabled = true;
          s.inputModePlateMath = false;
          s.preferredRpeSystem = 'RPE';
          s.syncToHealthKit = false;
          s.defaultWorkoutVisibility = 'PUBLIC';
          s.activeInjuries = [];
          s.notificationPreferences = {};
          s.equipmentOverrides = {};
          s.createdAt = new Date();
          s.updatedAt = new Date();
        });
      }
    });
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await saveSettings();
      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Still navigate even if save fails
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollAndComplete = async () => {
    if (!user) return;

    setEnrolling(true);
    try {
      await saveSettings();

      // Enroll in First 30 Days program
      const { error } = await supabase.functions.invoke('enroll-program', {
        body: { programCode: 'FIRST_30_DAYS' },
      });

      if (error) {
        console.error('Error enrolling in program:', error);
      }

      // Navigate to program tab
      router.replace('/(tabs)/program' as never);
    } catch (error) {
      console.error('Error enrolling:', error);
      // Still navigate to main app
      router.replace('/(tabs)');
    } finally {
      setEnrolling(false);
    }
  };

  const handleSkip = () => {
    // Skip onboarding - use defaults
    handleComplete();
  };

  // Screen 1: Name + Weight Unit
  if (step === 1) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome to Spotter!</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Let's get you set up
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>What should we call you?</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoFocus
              />

              <Text style={[styles.label, { color: colors.textPrimary, marginTop: 24 }]}>Weight Unit</Text>
              <View style={styles.unitSelector}>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    weightUnit === 'KG' && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setWeightUnit('KG')}
                >
                  <Text style={[
                    styles.unitButtonText,
                    { color: weightUnit === 'KG' ? colors.background : colors.textPrimary },
                  ]}>
                    Kilograms (kg)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    weightUnit === 'LBS' && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setWeightUnit('LBS')}
                >
                  <Text style={[
                    styles.unitButtonText,
                    { color: weightUnit === 'LBS' ? colors.background : colors.textPrimary },
                  ]}>
                    Pounds (lbs)
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: colors.primary },
                  (!name.trim() || loading) && styles.buttonDisabled,
                ]}
                onPress={() => setStep(2)}
                disabled={!name.trim() || loading}
              >
                <Text style={[styles.buttonText, { color: colors.background }]}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Screen 2: Persona Selection (SKIPPABLE)
  if (step === 2) {
    const personas = [
      {
        id: 'NEWBIE' as const,
        title: 'Newbie',
        description: 'Just started, want guidance',
        features: 'Simple Mode, First 30 Days program',
      },
      {
        id: 'CASUAL' as const,
        title: 'Casual',
        description: '1-2x per week, keep it simple',
        features: 'Quick Log, Weekly view',
      },
      {
        id: 'REGULAR' as const,
        title: 'Regular',
        description: '3-4x per week, track progress',
        features: 'Full Mode, Progress charts',
      },
      {
        id: 'DEDICATED' as const,
        title: 'Dedicated',
        description: '5-6x per week, advanced tracking',
        features: 'Percentages, Training Max',
      },
    ];

    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>What describes you?</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              This helps us customize your experience
            </Text>
          </View>

          <View style={styles.personaList}>
            {personas.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.personaCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  persona === p.id && { borderColor: colors.primary, borderWidth: 2 },
                ]}
                onPress={() => setPersona(p.id)}
              >
                <Text style={[styles.personaTitle, { color: colors.textPrimary }]}>{p.title}</Text>
                <Text style={[styles.personaDescription, { color: colors.textSecondary }]}>
                  {p.description}
                </Text>
                <Text style={[styles.personaFeatures, { color: colors.textMuted }]}>
                  {p.features}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.skipButton, { borderColor: colors.border }]}
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => {
                // Show Step 3 for NEWBIE, otherwise complete
                if (persona === 'NEWBIE') {
                  setStep(3);
                } else {
                  handleComplete();
                }
              }}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>
                {loading ? 'Loading...' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Screen 3: First 30 Days Program (NEWBIE only)
  if (step === 3) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.programEmoji}>📚</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Start Your Journey
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              We have a special program just for you!
            </Text>
          </View>

          <View style={[styles.programCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <Text style={[styles.programTitle, { color: colors.primary }]}>
              First 30 Days
            </Text>
            <Text style={[styles.programDescription, { color: colors.textPrimary }]}>
              A 4-week guided program designed for beginners
            </Text>
            <View style={styles.programFeatures}>
              <View style={styles.programFeature}>
                <Text style={styles.programFeatureIcon}>📖</Text>
                <Text style={[styles.programFeatureText, { color: colors.textSecondary }]}>
                  Learn gym fundamentals
                </Text>
              </View>
              <View style={styles.programFeature}>
                <Text style={styles.programFeatureIcon}>🎥</Text>
                <Text style={[styles.programFeatureText, { color: colors.textSecondary }]}>
                  Video demos for every exercise
                </Text>
              </View>
              <View style={styles.programFeature}>
                <Text style={styles.programFeatureIcon}>💪</Text>
                <Text style={[styles.programFeatureText, { color: colors.textSecondary }]}>
                  12 structured workouts
                </Text>
              </View>
              <View style={styles.programFeature}>
                <Text style={styles.programFeatureIcon}>🏆</Text>
                <Text style={[styles.programFeatureText, { color: colors.textSecondary }]}>
                  Earn a completion badge
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.enrollButton, { backgroundColor: colors.primary }]}
            onPress={handleEnrollAndComplete}
            disabled={enrolling}
          >
            {enrolling ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.background }]}>
                Start First 30 Days
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.skipProgramButton]}
            onPress={handleComplete}
            disabled={enrolling || loading}
          >
            <Text style={[styles.skipProgramText, { color: colors.textMuted }]}>
              Maybe later - I'll explore on my own
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  unitButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  unitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  personaList: {
    gap: 12,
    marginBottom: 24,
  },
  personaCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  personaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  personaDescription: {
    fontSize: 16,
    marginBottom: 8,
  },
  personaFeatures: {
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  skipButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  programEmoji: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 16,
  },
  programCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 24,
    marginBottom: 24,
  },
  programTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  programDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  programFeatures: {
    gap: 12,
  },
  programFeature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  programFeatureIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
  },
  programFeatureText: {
    fontSize: 15,
    flex: 1,
  },
  enrollButton: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  skipProgramButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipProgramText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
