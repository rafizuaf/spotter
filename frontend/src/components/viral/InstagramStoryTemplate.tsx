/**
 * InstagramStoryTemplate Component
 * Phase 2G: Social & Competition - Instagram Story Sharing
 * 
 * Base template for Instagram Stories (1080x1920, 9:16 aspect ratio)
 * Supports dark mode, light mode, and transparent backgrounds
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface InstagramStoryTemplateProps {
  children: React.ReactNode;
  variant?: 'dark' | 'light' | 'transparent';
  title?: string;
  subtitle?: string;
}

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCALE = SCREEN_WIDTH / STORY_WIDTH;

export default function InstagramStoryTemplate({
  children,
  variant = 'dark',
  title,
  subtitle,
}: InstagramStoryTemplateProps) {
  const colors = useTheme();
  const isDark = variant === 'dark' || (variant !== 'light' && variant !== 'transparent');

  const backgroundColor = variant === 'transparent' 
    ? 'transparent' 
    : isDark 
    ? '#0a0a0a' 
    : '#fafafa';

  const textColor = isDark ? '#f5f5f5' : '#1a1a1a';
  const accentColor = colors.primary;

  return (
    <View
      style={[
        styles.container,
        {
          width: STORY_WIDTH * SCALE,
          height: STORY_HEIGHT * SCALE,
          backgroundColor,
        },
      ]}
    >
      {title && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: accentColor }]}>{subtitle}</Text>
          )}
        </View>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: 100 * SCALE,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 60 * SCALE,
  },
  title: {
    fontSize: 64 * SCALE,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16 * SCALE,
  },
  subtitle: {
    fontSize: 32 * SCALE,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 60 * SCALE,
  },
});
