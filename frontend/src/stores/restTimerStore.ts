import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { logError } from '../utils/errorHandler';

/**
 * Rest Timer Store
 * Manages the rest timer state during workouts.
 * Auto-starts after set completion when enabled in user settings.
 */

interface RestTimerState {
  // Timer state
  isRunning: boolean;
  isPaused: boolean;
  currentSeconds: number;
  targetSeconds: number;

  // Context (which set triggered the timer)
  exerciseEntryId: string | null;
  setId: string | null;

  // Completion tracking
  hasCompleted: boolean;

  // User preferences (loaded from settings)
  timerEnabled: boolean; // C4: Enable/disable timer entirely
  autoStart: boolean; // C4: Auto-start after set completion
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  defaultDuration: number;

  // Actions
  startTimer: (seconds?: number, exerciseEntryId?: string, setId?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  stopTimer: () => void;
  tick: () => void;
  adjustTime: (delta: number) => void;
  setTargetSeconds: (seconds: number) => void;
  loadUserPreferences: (settings: {
    timerEnabled: boolean; // C4: Enable/disable timer
    timerAutoStart: boolean;
    timerVibrationEnabled: boolean;
    timerSoundEnabled: boolean;
    defaultRestTimeSeconds?: number;
  }) => void;
  onTimerComplete: () => Promise<void>;
}

// Default rest time in seconds (90 seconds)
const DEFAULT_REST_TIME = 90;

// Sound object for timer completion
let timerSound: Audio.Sound | null = null;

const loadSound = async (): Promise<Audio.Sound | null> => {
  try {
    // Load a built-in system sound or bundled audio
    // For now, we'll use expo-av's default capabilities
    const { sound } = await Audio.Sound.createAsync(
      // Use a simple tone - in production, bundle a proper sound file
      { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
      { shouldPlay: false }
    );
    return sound;
  } catch (error) {
    logError(error, 'restTimer_loadSound');
    return null;
  }
};

const playTimerSound = async (): Promise<void> => {
  try {
    if (!timerSound) {
      timerSound = await loadSound();
    }
    if (timerSound) {
      await timerSound.setPositionAsync(0);
      await timerSound.playAsync();
    }
  } catch (error) {
    logError(error, 'restTimer_playSound');
  }
};

export const useRestTimerStore = create<RestTimerState>((set, get) => ({
  // Initial state
  isRunning: false,
  isPaused: false,
  currentSeconds: DEFAULT_REST_TIME,
  targetSeconds: DEFAULT_REST_TIME,
  exerciseEntryId: null,
  setId: null,
  hasCompleted: false,

  // User preferences (defaults)
  timerEnabled: true, // C4: Timer enabled by default
  autoStart: true,
  vibrationEnabled: true,
  soundEnabled: true,
  defaultDuration: DEFAULT_REST_TIME,

  startTimer: (seconds?: number, exerciseEntryId?: string, setId?: string) => {
    const state = get();
    // C4: Don't start timer if disabled
    if (!state.timerEnabled) {
      return;
    }
    const targetSeconds = seconds ?? state.defaultDuration;

    set({
      isRunning: true,
      isPaused: false,
      currentSeconds: targetSeconds,
      targetSeconds: targetSeconds,
      exerciseEntryId: exerciseEntryId ?? null,
      setId: setId ?? null,
      hasCompleted: false,
    });
  },

  pauseTimer: () => {
    set({
      isRunning: false,
      isPaused: true,
    });
  },

  resumeTimer: () => {
    const state = get();
    if (state.isPaused && state.currentSeconds > 0) {
      set({
        isRunning: true,
        isPaused: false,
      });
    }
  },

  resetTimer: () => {
    const state = get();
    set({
      currentSeconds: state.targetSeconds,
      isRunning: false,
      isPaused: false,
      hasCompleted: false,
    });
  },

  stopTimer: () => {
    set({
      isRunning: false,
      isPaused: false,
      currentSeconds: get().defaultDuration,
      targetSeconds: get().defaultDuration,
      exerciseEntryId: null,
      setId: null,
      hasCompleted: false,
    });
  },

  tick: () => {
    const state = get();
    if (!state.isRunning || state.currentSeconds <= 0) {
      return;
    }

    const newSeconds = state.currentSeconds - 1;

    if (newSeconds <= 0) {
      // Timer completed
      set({
        currentSeconds: 0,
        isRunning: false,
        hasCompleted: true,
      });

      // Trigger completion effects
      get().onTimerComplete();
    } else {
      set({
        currentSeconds: newSeconds,
      });
    }
  },

  adjustTime: (delta: number) => {
    const state = get();
    const newSeconds = Math.max(0, state.currentSeconds + delta);
    const newTarget = Math.max(0, state.targetSeconds + delta);

    set({
      currentSeconds: newSeconds,
      targetSeconds: newTarget,
    });
  },

  setTargetSeconds: (seconds: number) => {
    const validSeconds = Math.max(0, Math.min(600, seconds)); // Max 10 minutes
    set({
      targetSeconds: validSeconds,
      currentSeconds: validSeconds,
    });
  },

  loadUserPreferences: (settings) => {
    set({
      timerEnabled: settings.timerEnabled ?? true, // C4: Default to enabled
      autoStart: settings.timerAutoStart,
      vibrationEnabled: settings.timerVibrationEnabled,
      soundEnabled: settings.timerSoundEnabled,
      defaultDuration: settings.defaultRestTimeSeconds ?? DEFAULT_REST_TIME,
      targetSeconds: settings.defaultRestTimeSeconds ?? DEFAULT_REST_TIME,
      currentSeconds: settings.defaultRestTimeSeconds ?? DEFAULT_REST_TIME,
    });
  },

  onTimerComplete: async () => {
    const state = get();

    // Haptic feedback
    if (state.vibrationEnabled) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        logError(error, 'restTimer_hapticFeedback');
      }
    }

    // Sound alert
    if (state.soundEnabled) {
      await playTimerSound();
    }
  },
}));

// Helper function to format seconds as MM:SS
export const formatTimerDisplay = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Common rest time presets
export const REST_TIME_PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
];

export default useRestTimerStore;
