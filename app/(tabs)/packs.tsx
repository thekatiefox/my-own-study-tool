import React, { useState, useCallback } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useFocusEffect, useRouter } from 'expo-router';
import { getAllPacks, getPackProgress } from '@/lib/database';
import { loadAllPacks } from '@/lib/packs';
import PackCard from '@/components/PackCard';

const PACK_CATEGORIES: Record<string, string> = {
  'js-fundamentals': 'Core Skills',
  'css-layout': 'Core Skills',
  'typescript-essentials': 'Core Skills',
  'web-performance': 'Core Skills',
  'react-patterns': 'Advanced',
  'react-advanced': 'Advanced',
  'typescript-advanced': 'Advanced',
  'build-tools': 'Advanced',
  'code-review': 'Senior Level',
  'code-review-advanced': 'Senior Level',
  'system-design-fe': 'Senior Level',
  'frontend-architecture': 'Senior Level',
};

const CATEGORY_ORDER = ['Core Skills', 'Advanced', 'Senior Level'];
const CATEGORY_ICONS: Record<string, string> = {
  'Core Skills': '📘',
  'Advanced': '🚀',
  'Senior Level': '👑',
};

interface PackDisplay {
  id: string;
  name: string;
  description: string;
  icon: string;
  totalCards: number;
  learnedCards: number;
  dueCards: number;
}

export default function PacksScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const [packs, setPacks] = useState<PackDisplay[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    await loadAllPacks();
    const allPacks = await getAllPacks();

    const packsWithProgress: PackDisplay[] = await Promise.all(
      allPacks.map(async (pack) => {
        const progress = await getPackProgress(pack.id);
        return {
          id: pack.id,
          name: pack.name,
          description: pack.description,
          icon: pack.icon,
          totalCards: progress.totalCards,
          learnedCards: progress.learnedCards,
          dueCards: progress.dueCards,
        };
      })
    );

    setPacks(packsWithProgress);
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>Card Packs</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Choose a pack to study
      </Text>

      {CATEGORY_ORDER.map((category) => {
        const categoryPacks = packs.filter(p => PACK_CATEGORIES[p.id] === category);
        if (categoryPacks.length === 0) return null;
        return (
          <View key={category} style={styles.categorySection}>
            <Text style={[styles.categoryTitle, { color: colors.text }]}>
              {CATEGORY_ICONS[category]} {category}
            </Text>
            {categoryPacks.map((pack) => (
              <PackCard
                key={pack.id}
                name={pack.name}
                description={pack.description}
                icon={pack.icon}
                totalCards={pack.totalCards}
                learnedCards={pack.learnedCards}
                dueCards={pack.dueCards}
                onPress={() => router.push(`/review/${pack.id}`)}
              />
            ))}
          </View>
        );
      })}

      {packs.length === 0 && (
        <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Loading packs...
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  categorySection: {
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginBottom: 10,
    marginTop: 16,
  },
  emptyState: {
    marginHorizontal: 24,
    padding: 40,
    borderRadius: 14,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
});
