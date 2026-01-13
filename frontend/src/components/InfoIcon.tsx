import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { getTermById, type GlossaryTerm } from '../constants/glossary';

interface InfoIconProps {
  termId: string;
  size?: 'small' | 'medium';
  style?: object;
}

export default function InfoIcon({ termId, size = 'small', style }: InfoIconProps) {
  const colors = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const term = getTermById(termId);

  if (!term) {
    return null;
  }

  const iconSize = size === 'small' ? 16 : 20;
  const fontSize = size === 'small' ? 10 : 12;

  return (
    <>
      <TouchableOpacity
        style={[
          styles.iconButton,
          {
            width: iconSize,
            height: iconSize,
            backgroundColor: colors.primary + '20',
          },
          style,
        ]}
        onPress={() => setModalVisible(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel={`Learn about ${term.term}`}
        accessibilityRole="button"
        accessibilityHint={`Opens explanation of ${term.fullName || term.term}`}
      >
        <Text style={[styles.iconText, { fontSize, color: colors.primary }]}>?</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.termText, { color: colors.textPrimary }]}>
                  {term.term}
                </Text>
                {term.fullName && (
                  <Text style={[styles.fullNameText, { color: colors.textSecondary }]}>
                    {term.fullName}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Text style={[styles.closeButton, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.definitionText, { color: colors.textPrimary }]}>
              {term.definition}
            </Text>

            {term.example && (
              <View style={[styles.exampleContainer, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.exampleLabel, { color: colors.textMuted }]}>
                  Example
                </Text>
                <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
                  {term.example}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.gotItButton, { backgroundColor: colors.primary }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.gotItButtonText, { color: colors.background }]}>
                Got it
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// Convenience component for specific terms
export function RPEInfoIcon(props: Omit<InfoIconProps, 'termId'>) {
  return <InfoIcon termId="rpe" {...props} />;
}

export function RIRInfoIcon(props: Omit<InfoIconProps, 'termId'>) {
  return <InfoIcon termId="rir" {...props} />;
}

export function OneRMInfoIcon(props: Omit<InfoIconProps, 'termId'>) {
  return <InfoIcon termId="1rm" {...props} />;
}

const styles = StyleSheet.create({
  iconButton: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  termText: {
    fontSize: 22,
    fontWeight: '700',
  },
  fullNameText: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    fontSize: 20,
    padding: 4,
  },
  definitionText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  exampleContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  exampleLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  gotItButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  gotItButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
