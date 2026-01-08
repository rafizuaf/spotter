import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewProps,
  Text,
  TextProps,
  TextInput,
  TextInputProps,
  Switch,
  SwitchProps,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  getButtonA11yProps,
  getLinkA11yProps,
  getHeaderA11yProps,
  getProgressA11yProps,
  getLiveRegionProps,
  getStateA11yProps,
  minTouchTarget,
} from '../utils/accessibility';

/**
 * AccessibleButton - TouchableOpacity with proper accessibility props
 */
interface AccessibleButtonProps extends TouchableOpacityProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export const AccessibleButton = React.memo(function AccessibleButton({
  label,
  hint,
  children,
  style,
  disabled,
  ...props
}: AccessibleButtonProps) {
  return (
    <TouchableOpacity
      {...props}
      {...getButtonA11yProps(label, hint)}
      {...getStateA11yProps({ disabled })}
      style={[styles.minTouchTarget, style]}
      disabled={disabled}
    >
      {children}
    </TouchableOpacity>
  );
});

/**
 * AccessibleLink - Touchable styled as a link
 */
interface AccessibleLinkProps extends TouchableOpacityProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export const AccessibleLink = React.memo(function AccessibleLink({
  label,
  hint,
  children,
  style,
  ...props
}: AccessibleLinkProps) {
  return (
    <TouchableOpacity
      {...props}
      {...getLinkA11yProps(label, hint)}
      style={[styles.minTouchTarget, style]}
    >
      {children}
    </TouchableOpacity>
  );
});

/**
 * AccessibleHeader - Text styled as a header with proper role
 */
interface AccessibleHeaderProps extends TextProps {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
}

export const AccessibleHeader = React.memo(function AccessibleHeader({
  level = 1,
  children,
  style,
  ...props
}: AccessibleHeaderProps) {
  const fontSize = {
    1: 28,
    2: 24,
    3: 20,
    4: 18,
    5: 16,
    6: 14,
  }[level];

  return (
    <Text
      {...props}
      {...getHeaderA11yProps()}
      style={[{ fontSize, fontWeight: 'bold', color: '#fff' }, style]}
    >
      {children}
    </Text>
  );
});

/**
 * AccessibleInput - TextInput with proper accessibility props
 */
interface AccessibleInputProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
}

export const AccessibleInput = React.memo(function AccessibleInput({
  label,
  hint,
  error,
  style,
  ...props
}: AccessibleInputProps) {
  const accessibilityLabel = error
    ? `${label}, error: ${error}`
    : hint
    ? `${label}, ${hint}`
    : label;

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        {...props}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={hint}
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor="#64748b"
      />
      {error && (
        <Text
          style={styles.errorText}
          {...getLiveRegionProps('polite')}
        >
          {error}
        </Text>
      )}
    </View>
  );
});

/**
 * AccessibleSwitch - Switch with proper label
 */
interface AccessibleSwitchProps extends Omit<SwitchProps, 'accessibilityLabel'> {
  label: string;
  description?: string;
}

export const AccessibleSwitch = React.memo(function AccessibleSwitch({
  label,
  description,
  value,
  ...props
}: AccessibleSwitchProps) {
  return (
    <View style={styles.switchContainer}>
      <View style={styles.switchLabels}>
        <Text style={styles.switchLabel}>{label}</Text>
        {description && (
          <Text style={styles.switchDescription}>{description}</Text>
        )}
      </View>
      <Switch
        {...props}
        value={value}
        accessibilityLabel={`${label}, ${value ? 'on' : 'off'}`}
        accessibilityRole="switch"
        {...getStateA11yProps({ checked: value })}
        trackColor={{ false: '#334155', true: '#6366f1' }}
        thumbColor={value ? '#fff' : '#94a3b8'}
      />
    </View>
  );
});

/**
 * AccessibleProgress - Progress bar with accessibility
 */
interface AccessibleProgressProps extends ViewProps {
  label: string;
  value: number;
  max: number;
  min?: number;
  showText?: boolean;
}

export const AccessibleProgress = React.memo(function AccessibleProgress({
  label,
  value,
  max,
  min = 0,
  showText = true,
  style,
  ...props
}: AccessibleProgressProps) {
  const progress = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <View style={[styles.progressContainer, style]} {...props}>
      {showText && (
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={styles.progressValue}>{Math.round(progress)}%</Text>
        </View>
      )}
      <View
        style={styles.progressTrack}
        {...getProgressA11yProps(label, value, max, min)}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${progress}%` },
          ]}
        />
      </View>
    </View>
  );
});

/**
 * LiveRegion - Announces content changes to screen readers
 */
interface LiveRegionProps extends ViewProps {
  priority?: 'polite' | 'assertive';
  children: React.ReactNode;
}

export const LiveRegion = React.memo(function LiveRegion({
  priority = 'polite',
  children,
  ...props
}: LiveRegionProps) {
  return (
    <View {...props} {...getLiveRegionProps(priority)}>
      {children}
    </View>
  );
});

/**
 * ScreenReaderOnly - Content only visible to screen readers
 */
interface ScreenReaderOnlyProps {
  children: React.ReactNode;
}

export const ScreenReaderOnly = React.memo(function ScreenReaderOnly({
  children,
}: ScreenReaderOnlyProps) {
  return (
    <View
      style={styles.screenReaderOnly}
      accessible={true}
      importantForAccessibility="yes"
    >
      {children}
    </View>
  );
});

/**
 * SkipLink - Skip to main content link (useful for keyboard navigation)
 */
interface SkipLinkProps {
  targetId: string;
  label?: string;
}

export const SkipLink = React.memo(function SkipLink({
  targetId,
  label = 'Skip to main content',
}: SkipLinkProps) {
  // Web only - skip navigation
  if (Platform.OS !== 'web') return null;

  return (
    <TouchableOpacity
      accessible={true}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={styles.skipLink}
      // On web, this would scroll to the target element
      onPress={() => {
        // Web-specific implementation
      }}
    >
      <Text style={styles.skipLinkText}>{label}</Text>
    </TouchableOpacity>
  );
});

/**
 * FocusTrap - Traps focus within a modal or dialog
 */
interface FocusTrapProps extends ViewProps {
  active?: boolean;
  children: React.ReactNode;
}

export const FocusTrap = React.memo(function FocusTrap({
  active = true,
  children,
  ...props
}: FocusTrapProps) {
  // Focus management for accessibility
  return (
    <View
      {...props}
      accessible={active}
      accessibilityViewIsModal={active}
    >
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  minTouchTarget: {
    minWidth: minTouchTarget.current,
    minHeight: minTouchTarget.current,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  switchLabels: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    color: '#fff',
    fontSize: 16,
  },
  switchDescription: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  progressContainer: {
    width: '100%',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  progressValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  screenReaderOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
  },
  skipLink: {
    position: 'absolute',
    top: -100,
    left: 0,
    backgroundColor: '#6366f1',
    padding: 16,
    zIndex: 9999,
  },
  skipLinkText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default {
  AccessibleButton,
  AccessibleLink,
  AccessibleHeader,
  AccessibleInput,
  AccessibleSwitch,
  AccessibleProgress,
  LiveRegion,
  ScreenReaderOnly,
  SkipLink,
  FocusTrap,
};
