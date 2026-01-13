import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import GlossaryCard from '../../src/components/GlossaryCard';
import {
  GLOSSARY_TERMS,
  GLOSSARY_CATEGORIES,
  searchGlossary,
  getTermsByCategory,
  type GlossaryTerm,
} from '../../src/constants/glossary';

export default function GlossaryScreen() {
  const colors = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GlossaryTerm['category'] | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const getFilteredTerms = useCallback((): GlossaryTerm[] => {
    let terms = GLOSSARY_TERMS;

    // Apply category filter first
    if (selectedCategory) {
      terms = getTermsByCategory(selectedCategory);
    }

    // Then apply search filter
    if (searchQuery.trim()) {
      const searchResults = searchGlossary(searchQuery);
      terms = terms.filter(term => searchResults.some(r => r.id === term.id));
    }

    return terms;
  }, [searchQuery, selectedCategory]);

  const handleRelatedTermPress = useCallback((termId: string) => {
    // Clear filters to show all terms
    setSelectedCategory(null);
    setSearchQuery('');

    // Scroll to top and let user find the term
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });

    // Set search to the related term
    const term = GLOSSARY_TERMS.find(t => t.id === termId);
    if (term) {
      setSearchQuery(term.term);
    }
  }, []);

  const handleCategoryPress = (category: GlossaryTerm['category']) => {
    setSelectedCategory(prev => prev === category ? null : category);
    setSearchQuery(''); // Clear search when selecting category
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSearchQuery('');
  };

  const filteredTerms = getFilteredTerms();
  const hasFilters = searchQuery.trim() || selectedCategory;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Fitness Glossary' }} />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <Text style={[styles.searchIcon, { color: colors.textMuted }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search terms..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search glossary terms"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              accessibilityLabel="Clear search"
            >
              <Text style={[styles.clearIcon, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScrollView}
        contentContainerStyle={styles.categoryContainer}
      >
        {GLOSSARY_CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryPill,
                { backgroundColor: colors.surface },
                isSelected && { backgroundColor: colors.primary },
              ]}
              onPress={() => handleCategoryPress(category.id as GlossaryTerm['category'])}
              accessibilityLabel={`Filter by ${category.label}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  { color: colors.textSecondary },
                  isSelected && { color: colors.background },
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: colors.textMuted }]}>
          {filteredTerms.length} term{filteredTerms.length !== 1 ? 's' : ''}
          {hasFilters ? ' found' : ''}
        </Text>
        {hasFilters && (
          <TouchableOpacity onPress={clearFilters}>
            <Text style={[styles.clearFilters, { color: colors.primary }]}>
              Clear filters
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Terms List */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.termsList}
        contentContainerStyle={styles.termsListContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredTerms.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyStateIcon]}>📚</Text>
            <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>
              No terms found
            </Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              Try a different search term or category
            </Text>
          </View>
        ) : (
          filteredTerms.map((term) => (
            <GlossaryCard
              key={term.id}
              term={term}
              onRelatedTermPress={handleRelatedTermPress}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearIcon: {
    fontSize: 16,
    padding: 4,
  },
  categoryScrollView: {
    maxHeight: 44,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultsCount: {
    fontSize: 14,
  },
  clearFilters: {
    fontSize: 14,
    fontWeight: '500',
  },
  termsList: {
    flex: 1,
  },
  termsListContent: {
    padding: 16,
    paddingTop: 0,
  },
  emptyState: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
