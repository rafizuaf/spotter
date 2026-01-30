import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';

export default function ShortcutsScreen() {
  const colors = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Shortcuts' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[styles.iconContainer, { backgroundColor: colors.surface }]}
          accessible
          accessibilityRole="image"
          accessibilityLabel="Shortcuts icon"
        >
          <Text style={[styles.icon]}>🎙️</Text>
        </View>

        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          accessibilityRole="header"
        >
          Voice Shortcuts
        </Text>

        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Start workouts, log exercises, and check your stats using Siri or Google
          Assistant voice commands.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text
            style={[styles.cardTitle, { color: colors.textPrimary }]}
            accessibilityRole="header"
          >
            Available Commands
          </Text>
          {[
            { platform: 'Siri', command: '"Hey Siri, start my workout in Spotter"' },
            { platform: 'Siri', command: '"Hey Siri, log my Bench Press"' },
            { platform: 'Google', command: '"Hey Google, open Spotter workout"' },
            { platform: 'Google', command: '"Hey Google, show my gym stats"' },
          ].map((shortcut, index) => (
            <View
              key={index}
              style={styles.shortcutRow}
              accessible
              accessibilityLabel={`${shortcut.platform} command: ${shortcut.command}`}
            >
              <Text style={[styles.platform, { color: colors.primary }]}>
                {shortcut.platform}
              </Text>
              <Text style={[styles.command, { color: colors.textPrimary }]}>
                {shortcut.command}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text
            style={[styles.cardTitle, { color: colors.textPrimary }]}
            accessibilityRole="header"
          >
            Setup Required
          </Text>
          <Text style={[styles.setupText, { color: colors.textSecondary }]}>
            Voice shortcut support requires native intent definitions for iOS (SiriKit
            / App Intents) and Android (App Actions). This feature will be available
            in a future update after native build integration is complete.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  shortcutRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  platform: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  command: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  setupText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
