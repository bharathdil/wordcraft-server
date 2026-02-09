import React, { useState } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, TextInput, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { RULES_DATA } from '@/lib/tutorial-data';

export default function RulesScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Setup');

  const filteredRules = RULES_DATA.map(cat => ({
    ...cat,
    rules: cat.rules.filter(
      r => !searchQuery ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(cat => cat.rules.length > 0);

  const categoryIcons: Record<string, string> = {
    'Setup': 'settings',
    'Gameplay': 'play-circle',
    'Scoring': 'award',
    'Tile Values': 'hash',
  };

  const categoryColors: Record<string, string> = {
    'Setup': Colors.accent.teal,
    'Gameplay': Colors.accent.gold,
    'Scoring': '#7C6BC4',
    'Tile Values': '#C4856B',
  };

  return (
    <View style={[styles.container, { paddingTop: (insets.top || webTopInset) + 12 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={Colors.ui.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Rules Reference</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color={Colors.ui.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search rules..."
          placeholderTextColor={Colors.ui.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')}>
            <Feather name="x" size={18} color={Colors.ui.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: (insets.bottom || webBottomInset) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {filteredRules.map((category, catIndex) => {
          const isExpanded = expandedCategory === category.category || !!searchQuery;
          const color = categoryColors[category.category] || Colors.accent.teal;
          const icon = categoryIcons[category.category] || 'book';

          return (
            <Animated.View key={category.category} entering={FadeInDown.delay(catIndex * 80).springify()}>
              <Pressable
                onPress={() => setExpandedCategory(isExpanded && !searchQuery ? null : category.category)}
                style={styles.categoryHeader}
              >
                <View style={[styles.categoryIcon, { backgroundColor: color + '20' }]}>
                  <Feather name={icon as any} size={18} color={color} />
                </View>
                <Text style={styles.categoryTitle}>{category.category}</Text>
                <Text style={styles.categoryCount}>{category.rules.length}</Text>
                <Feather
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.ui.textMuted}
                />
              </Pressable>

              {isExpanded && (
                <View style={styles.rulesContainer}>
                  {category.rules.map((rule, ruleIndex) => (
                    <View key={ruleIndex} style={styles.ruleItem}>
                      <Text style={styles.ruleTitle}>{rule.title}</Text>
                      <Text style={styles.ruleDesc}>{rule.description}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>
          );
        })}

        {filteredRules.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="search" size={40} color={Colors.ui.textMuted} />
            <Text style={styles.emptyText}>No rules found for "{searchQuery}"</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.ui.text,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.ui.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.ui.text,
    padding: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.ui.cardBorder,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTitle: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.ui.text,
  },
  categoryCount: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.ui.textMuted,
    backgroundColor: Colors.ui.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  rulesContainer: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 14,
    padding: 4,
    marginTop: -4,
    borderWidth: 1,
    borderColor: Colors.ui.cardBorder,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  ruleItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.divider,
  },
  ruleTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.ui.text,
    marginBottom: 4,
  },
  ruleDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.ui.textSecondary,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 16,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.ui.textMuted,
  },
});
