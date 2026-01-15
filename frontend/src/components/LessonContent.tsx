import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface LessonContentProps {
  title: string;
  content: string;
  isRead: boolean;
  onMarkRead: () => void;
}

export default function LessonContent({
  title,
  content,
  isRead,
  onMarkRead,
}: LessonContentProps) {
  const colors = useTheme();
  const [expanded, setExpanded] = useState(!isRead);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  // Simple markdown-ish parsing
  const renderContent = () => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      // Headers
      if (line.startsWith('## ')) {
        return (
          <Text
            key={index}
            style={[styles.heading2, { color: colors.textPrimary }]}
          >
            {line.substring(3)}
          </Text>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <Text
            key={index}
            style={[styles.heading3, { color: colors.textPrimary }]}
          >
            {line.substring(4)}
          </Text>
        );
      }

      // Bold text (simple replacement)
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <Text key={index} style={[styles.paragraph, { color: colors.textSecondary }]}>
            {parts.map((part, i) =>
              i % 2 === 1 ? (
                <Text key={i} style={{ fontWeight: 'bold', color: colors.textPrimary }}>
                  {part}
                </Text>
              ) : (
                part
              )
            )}
          </Text>
        );
      }

      // List items
      if (line.startsWith('- ')) {
        return (
          <View key={index} style={styles.listItem}>
            <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
            <Text style={[styles.listItemText, { color: colors.textSecondary }]}>
              {line.substring(2)}
            </Text>
          </View>
        );
      }

      // Numbered list
      const numberedMatch = line.match(/^(\d+)\. (.+)/);
      if (numberedMatch) {
        return (
          <View key={index} style={styles.listItem}>
            <Text style={[styles.numberBullet, { color: colors.primary }]}>
              {numberedMatch[1]}.
            </Text>
            <Text style={[styles.listItemText, { color: colors.textSecondary }]}>
              {numberedMatch[2]}
            </Text>
          </View>
        );
      }

      // Empty line
      if (line.trim() === '') {
        return <View key={index} style={styles.spacer} />;
      }

      // Regular paragraph
      return (
        <Text key={index} style={[styles.paragraph, { color: colors.textSecondary }]}>
          {line}
        </Text>
      );
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={toggleExpanded}
        accessible={true}
        accessibilityLabel={`${title}. ${expanded ? 'Tap to collapse' : 'Tap to expand'}`}
        accessibilityRole="button"
      >
        <View style={styles.titleRow}>
          <Text style={[styles.lessonIcon, { color: colors.primary }]}>📖</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        </View>
        <Text style={[styles.expandIcon, { color: colors.textMuted }]}>
          {expanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.contentContainer}>
          {renderContent()}

          {!isRead && (
            <TouchableOpacity
              style={[styles.markReadButton, { backgroundColor: colors.primary }]}
              onPress={onMarkRead}
            >
              <Text style={[styles.markReadText, { color: colors.background }]}>
                I've Read This
              </Text>
            </TouchableOpacity>
          )}

          {isRead && (
            <View style={[styles.readBadge, { backgroundColor: colors.success + '20' }]}>
              <Text style={[styles.readBadgeText, { color: colors.success }]}>
                ✓ Lesson Complete
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lessonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  expandIcon: {
    fontSize: 14,
    marginLeft: 8,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 0,
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  heading3: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 8,
  },
  bullet: {
    fontSize: 16,
    marginRight: 8,
    lineHeight: 24,
  },
  numberBullet: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    lineHeight: 24,
    minWidth: 20,
  },
  listItemText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  spacer: {
    height: 8,
  },
  markReadButton: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  markReadText: {
    fontSize: 16,
    fontWeight: '600',
  },
  readBadge: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  readBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
