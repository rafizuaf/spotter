import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useInterval } from '../hooks/usePerformance';
import {
  useRestTimerStore,
  formatTimerDisplay,
  REST_TIME_PRESETS,
} from '../stores/restTimerStore';
import type { Colors } from '../utils/colors';

interface RestTimerProps {
  /** Whether the timer overlay is visible */
  visible?: boolean;
  /** Callback when timer is dismissed */
  onDismiss?: () => void;
  /** Callback when timer completes */
  onComplete?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TIMER_SIZE = 120;
const COLLAPSED_HEIGHT = 56;
const EXPANDED_HEIGHT = 220;

/**
 * RestTimer Component
 *
 * A floating timer overlay that shows during workouts.
 * Features:
 * - Circular progress indicator
 * - Play/Pause/Reset controls
 * - Time adjustment buttons (+15s, -15s)
 * - Collapsible to minimal pill view
 * - Auto-start capability (based on user settings)
 */
export default function RestTimer({
  visible = true,
  onDismiss,
  onComplete,
}: RestTimerProps) {
  const colors = useTheme();
  const styles = createStyles(colors);

  const {
    isRunning,
    isPaused,
    currentSeconds,
    targetSeconds,
    hasCompleted,
    tick,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    stopTimer,
    adjustTime,
    setTargetSeconds,
  } = useRestTimerStore();

  const [isExpanded, setIsExpanded] = React.useState(true);
  const expandAnimation = React.useRef(new Animated.Value(1)).current;

  // Timer tick effect - runs every second when timer is running
  useInterval(
    tick,
    isRunning ? 1000 : null
  );

  // Handle timer completion
  useEffect(() => {
    if (hasCompleted) {
      onComplete?.();
    }
  }, [hasCompleted, onComplete]);

  // Collapse/Expand animation
  const toggleExpand = useCallback(() => {
    const toValue = isExpanded ? 0 : 1;
    Animated.spring(expandAnimation, {
      toValue,
      useNativeDriver: false,
      friction: 10,
    }).start();
    setIsExpanded(!isExpanded);
  }, [isExpanded, expandAnimation]);

  // Calculate progress percentage
  const progress = targetSeconds > 0 ? currentSeconds / targetSeconds : 0;
  const progressDegrees = progress * 360;

  // Animated height for expand/collapse
  const animatedHeight = expandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSED_HEIGHT, EXPANDED_HEIGHT],
  });

  if (!visible) {
    return null;
  }

  const handlePlayPause = () => {
    if (isRunning) {
      pauseTimer();
    } else if (isPaused) {
      resumeTimer();
    } else {
      startTimer();
    }
  };

  const handleReset = () => {
    resetTimer();
  };

  const handleDismiss = () => {
    stopTimer();
    onDismiss?.();
  };

  const handlePresetSelect = (seconds: number) => {
    setTargetSeconds(seconds);
    startTimer(seconds);
  };

  // Render collapsed pill view
  if (!isExpanded) {
    return (
      <TouchableOpacity
        style={styles.collapsedContainer}
        onPress={toggleExpand}
        activeOpacity={0.9}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Rest timer: ${formatTimerDisplay(currentSeconds)} remaining. Tap to expand.`}
      >
        <View style={styles.collapsedContent}>
          <Ionicons
            name={isRunning ? 'timer' : 'timer-outline'}
            size={20}
            color={colors.primary}
          />
          <Text style={styles.collapsedTime}>
            {formatTimerDisplay(currentSeconds)}
          </Text>
          {isRunning && (
            <View style={styles.runningIndicator} />
          )}
        </View>
        <TouchableOpacity
          onPress={handlePlayPause}
          style={styles.collapsedButton}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={isRunning ? 'Pause timer' : 'Start timer'}
        >
          <Ionicons
            name={isRunning ? 'pause' : 'play'}
            size={18}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View style={[styles.container, { height: animatedHeight }]}>
      {/* Header with collapse and dismiss buttons */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={toggleExpand}
          style={styles.headerButton}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Collapse timer"
        >
          <Ionicons
            name="chevron-down"
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>REST TIMER</Text>
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.headerButton}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Dismiss timer"
        >
          <Ionicons
            name="close"
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Timer Display */}
      <View style={styles.timerContainer}>
        {/* Progress Ring */}
        <View style={styles.progressRing}>
          <View
            style={[
              styles.progressArc,
              {
                transform: [{ rotate: `-90deg` }],
                borderTopColor: progress > 0.25 ? colors.primary : colors.surfaceElevated,
                borderRightColor: progress > 0.5 ? colors.primary : colors.surfaceElevated,
                borderBottomColor: progress > 0.75 ? colors.primary : colors.surfaceElevated,
                borderLeftColor: progress > 0 ? colors.primary : colors.surfaceElevated,
              },
            ]}
          />
          <View style={styles.timerInner}>
            <Text style={styles.timerText}>
              {formatTimerDisplay(currentSeconds)}
            </Text>
            <Text style={styles.timerLabel}>
              {hasCompleted ? 'DONE!' : isRunning ? 'RESTING' : isPaused ? 'PAUSED' : 'READY'}
            </Text>
          </View>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.adjustButton}
          onPress={() => adjustTime(-15)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Subtract 15 seconds"
        >
          <Text style={styles.adjustButtonText}>-15s</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.playButton,
            hasCompleted && styles.playButtonCompleted,
          ]}
          onPress={hasCompleted ? handleReset : handlePlayPause}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={hasCompleted ? 'Reset timer' : isRunning ? 'Pause timer' : 'Start timer'}
        >
          <Ionicons
            name={hasCompleted ? 'refresh' : isRunning ? 'pause' : 'play'}
            size={32}
            color={hasCompleted ? colors.success : colors.background}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.adjustButton}
          onPress={() => adjustTime(15)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Add 15 seconds"
        >
          <Text style={styles.adjustButtonText}>+15s</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Presets (shown when not running) */}
      {!isRunning && !isPaused && (
        <View style={styles.presets}>
          {REST_TIME_PRESETS.slice(0, 4).map((preset) => (
            <TouchableOpacity
              key={preset.seconds}
              style={[
                styles.presetButton,
                targetSeconds === preset.seconds && styles.presetButtonActive,
              ]}
              onPress={() => handlePresetSelect(preset.seconds)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Set timer to ${preset.label}`}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  targetSeconds === preset.seconds && styles.presetButtonTextActive,
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 100,
      left: 16,
      right: 16,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    collapsedContainer: {
      position: 'absolute',
      bottom: 100,
      right: 16,
      backgroundColor: colors.surface,
      borderRadius: 28,
      paddingHorizontal: 16,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    collapsedContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    collapsedTime: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    collapsedButton: {
      marginLeft: 12,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceElevated,
      justifyContent: 'center',
      alignItems: 'center',
    },
    runningIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.success,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      letterSpacing: 1,
    },
    timerContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    progressRing: {
      width: TIMER_SIZE,
      height: TIMER_SIZE,
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressArc: {
      position: 'absolute',
      width: TIMER_SIZE,
      height: TIMER_SIZE,
      borderRadius: TIMER_SIZE / 2,
      borderWidth: 6,
      borderColor: colors.surfaceElevated,
    },
    timerInner: {
      width: TIMER_SIZE - 16,
      height: TIMER_SIZE - 16,
      borderRadius: (TIMER_SIZE - 16) / 2,
      backgroundColor: colors.surfaceElevated,
      justifyContent: 'center',
      alignItems: 'center',
    },
    timerText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    timerLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textSecondary,
      letterSpacing: 1,
      marginTop: 2,
    },
    controls: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 24,
    },
    adjustButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
    },
    adjustButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    playButton: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    playButtonCompleted: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 2,
      borderColor: colors.success,
    },
    presets: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginTop: 16,
    },
    presetButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: colors.surfaceElevated,
    },
    presetButtonActive: {
      backgroundColor: colors.primary,
    },
    presetButtonText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    presetButtonTextActive: {
      color: colors.background,
    },
  });
