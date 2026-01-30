import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';

export default function WidgetsScreen() {
  const colors = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Widgets' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[styles.iconContainer, { backgroundColor: colors.surface }]}
          accessible
          accessibilityRole="image"
          accessibilityLabel="Widget icon"
        >
          <Text style={[styles.icon]}>📱</Text>
        </View>

        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          accessibilityRole="header"
        >
          Home Screen Widgets
        </Text>

        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Display your workout stats, streaks, and progress directly on your home screen
          with native iOS and Android widgets.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text
            style={[styles.cardTitle, { color: colors.textPrimary }]}
            accessibilityRole="header"
          >
            Available Widgets
          </Text>
          {[
            { name: 'Weekly Progress', desc: 'Shows workouts completed this week' },
            { name: 'Current Streak', desc: 'Displays your active workout streak' },
            { name: 'Quick Start', desc: 'Start a workout with one tap' },
            { name: 'Level & XP', desc: 'Shows your current level and XP progress' },
          ].map((widget) => (
            <View
              key={widget.name}
              style={styles.widgetRow}
              accessible
              accessibilityLabel={`${widget.name}: ${widget.desc}`}
            >
              <Text style={[styles.widgetName, { color: colors.textPrimary }]}>
                {widget.name}
              </Text>
              <Text style={[styles.widgetDesc, { color: colors.textSecondary }]}>
                {widget.desc}
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
            Widget support requires native module implementation for iOS (WidgetKit)
            and Android (App Widgets). This feature will be available in a future update
            after native build integration is complete.
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
  widgetRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  widgetName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  widgetDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  setupText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
