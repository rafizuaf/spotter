import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { GlossaryTerm } from '../constants/glossary';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface GlossaryCardProps {
  term: GlossaryTerm;
  onRelatedTermPress?: (termId: string) => void;
}

export default function GlossaryCard({ term, onRelatedTermPress }: GlossaryCardProps) {
  const colors = useTheme();
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const getCategoryColor = (category: GlossaryTerm['category']) => {
    switch (category) {
      case 'intensity':
        return colors.error;
      case 'volume':
        return colors.primary;
      case 'exercise':
        return colors.success;
      case 'muscle':
        return '#9b59b6';
      case 'form':
        return '#3498db';
      case 'program':
        return '#e67e22';
      default:
        return colors.textMuted;
    }
  };

  const getCategoryLabel = (category: GlossaryTerm['category']) => {
    switch (category) {
      case 'intensity':
        return 'Intensity';
      case 'volume':
        return 'Volume';
      case 'exercise':
        return 'Exercise';
      case 'muscle':
        return 'Muscle';
      case 'form':
        return 'Form';
      case 'program':
        return 'Program';
      default:
        return category;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={toggleExpanded}
      activeOpacity={0.7}
      accessibilityLabel={`${term.term}: ${term.fullName || term.term}. Tap to ${expanded ? 'collapse' : 'expand'}`}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.term, { color: colors.textPrimary }]}>
            {term.term}
          </Text>
          {term.fullName && (
            <Text style={[styles.fullName, { color: colors.textSecondary }]}>
              {term.fullName}
            </Text>
          )}
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(term.category) + '20' }]}>
          <Text style={[styles.categoryText, { color: getCategoryColor(term.category) }]}>
            {getCategoryLabel(term.category)}
          </Text>
        </View>
      </View>

      <Text
        style={[styles.definition, { color: colors.textSecondary }]}
        numberOfLines={expanded ? undefined : 2}
      >
        {term.definition}
      </Text>

      {expanded && (
        <View style={styles.expandedContent}>
          {term.example && (
            <View style={[styles.exampleContainer, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.exampleLabel, { color: colors.textMuted }]}>
                Example
              </Text>
              <Text style={[styles.exampleText, { color: colors.textPrimary }]}>
                {term.example}
              </Text>
            </View>
          )}

          {term.relatedTerms && term.relatedTerms.length > 0 && (
            <View style={styles.relatedContainer}>
              <Text style={[styles.relatedLabel, { color: colors.textMuted }]}>
                Related Terms
              </Text>
              <View style={styles.relatedTerms}>
                {term.relatedTerms.map((relatedTerm) => (
                  <TouchableOpacity
                    key={relatedTerm}
                    style={[styles.relatedBadge, { backgroundColor: colors.primary + '20' }]}
                    onPress={() => onRelatedTermPress?.(relatedTerm.toLowerCase().replace(/\s+/g, '-'))}
                    accessibilityLabel={`Go to ${relatedTerm}`}
                    accessibilityRole="link"
                  >
                    <Text style={[styles.relatedBadgeText, { color: colors.primary }]}>
                      {relatedTerm}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      <View style={styles.expandIndicator}>
        <Text style={[styles.expandIcon, { color: colors.textMuted }]}>
          {expanded ? '▲' : '▼'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleRow: {
    flex: 1,
    marginRight: 12,
  },
  term: {
    fontSize: 18,
    fontWeight: '700',
  },
  fullName: {
    fontSize: 14,
    marginTop: 2,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  definition: {
    fontSize: 15,
    lineHeight: 22,
  },
  expandedContent: {
    marginTop: 12,
  },
  exampleContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  exampleLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exampleText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  relatedContainer: {
    marginTop: 4,
  },
  relatedLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  relatedTerms: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relatedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  relatedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  expandIndicator: {
    alignItems: 'center',
    marginTop: 8,
  },
  expandIcon: {
    fontSize: 12,
  },
});
