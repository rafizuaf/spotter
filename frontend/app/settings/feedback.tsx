/**
 * Feedback Screen
 * 
 * Allows users to send feedback and report bugs
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';
import FeedbackModal from '../../src/components/FeedbackModal';

export default function FeedbackScreen() {
  const colors = useTheme();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Stack.Screen options={{ title: 'Feedback' }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            We'd love to hear from you!
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Your feedback helps us improve Spotter. Report bugs, suggest features, or just let us know what you think.
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => setShowModal(true)}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>
              Send Feedback
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Other ways to reach us
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Email: support@spotter-app.com{'\n'}
            Twitter: @spotter_app
          </Text>
        </View>
      </ScrollView>

      <FeedbackModal visible={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
