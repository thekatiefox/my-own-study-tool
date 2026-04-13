import React, { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, Pressable } from 'react-native';
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
  'authentication': 'Core Skills',
  'authentication-advanced': 'Senior Level',
};

const CATEGORY_ORDER = ['Core Skills', 'Advanced', 'Senior Level'];
const CATEGORY_ICONS: Record<string, string> = {
  'Core Skills': '01',
  'Advanced': '02',
  'Senior Level': '03',
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

  const handleSurpriseMe = () => {
    if (packs.length === 0) return;
    // Priority: packs with due cards first, then core skills, then random
    const duePacks = packs.filter(p => p.dueCards > 0);
    if (duePacks.length > 0) {
      const pick = duePacks[Math.floor(Math.random() * duePacks.length)];
      router.push(`/review/${pick.id}`);
      return;
    }
    const corePacks = packs.filter(p => PACK_CATEGORIES[p.id] === 'Core Skills');
    const unfinishedCore = corePacks.filter(p => p.learnedCards < p.totalCards);
    if (unfinishedCore.length > 0) {
      const pick = unfinishedCore[Math.floor(Math.random() * unfinishedCore.length)];
      router.push(`/review/${pick.id}`);
      return;
    }
    // All core done — pick any pack with unlearned cards, else truly random
    const unfinished = packs.filter(p => p.learnedCards < p.totalCards);
    const pool = unfinished.length > 0 ? unfinished : packs;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    router.push(`/review/${pick.id}`);
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

      {/* Surprise Me — skip the decision */}
      {packs.length > 0 && (
        <Pressable
          onPress={handleSurpriseMe}
          style={({ pressed }) => [
            styles.surpriseButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.surpriseEmoji}>🎲</Text>
          <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <Text style={styles.surpriseTitle}>Surprise Me</Text>
            <Text style={styles.surpriseDesc}>Pick a pack for me and start studying</Text>
          </View>
        </Pressable>
      )}

      {/* Continue section — packs with due cards */}
      {(() => {
        const duePacks = packs.filter(p => p.dueCards > 0).sort((a, b) => b.dueCards - a.dueCards);
        if (duePacks.length === 0) return null;
        return (
          <View style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Text style={[styles.categoryNumber, { color: colors.danger }]}>
                !!
              </Text>
              <Text style={[styles.categoryTitle, { color: colors.text }]}>
                CONTINUE LEARNING
              </Text>
            </View>
            {duePacks.map((pack) => (
              <PackCard
                key={`due-${pack.id}`}
                name={pack.name}
                description={`${pack.dueCards} cards due for review`}
                icon={pack.icon}
                totalCards={pack.totalCards}
                learnedCards={pack.learnedCards}
                dueCards={pack.dueCards}
                onPress={() => router.push(`/review/${pack.id}`)}
              />
            ))}
          </View>
        );
      })()}

      {CATEGORY_ORDER.map((category) => {
        const categoryPacks = packs.filter(p => PACK_CATEGORIES[p.id] === category);
        if (categoryPacks.length === 0) return null;
        return (
          <View key={category} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Text style={[styles.categoryNumber, { color: colors.primary }]}>
                {CATEGORY_ICONS[category]}
              </Text>
              <Text style={[styles.categoryTitle, { color: colors.text }]}>
                {category}
              </Text>
            </View>
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter-Medium',
    letterSpacing: -0.3,
    marginBottom: 4,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    letterSpacing: 0.2,
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  surpriseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 16,
    borderRadius: 10,
  },
  surpriseEmoji: {
    fontSize: 24,
    marginRight: 14,
  },
  surpriseTitle: {
    color: '#FFF9F4',
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  surpriseDesc: {
    color: 'rgba(255,249,244,0.75)',
    fontSize: 12,
    letterSpacing: 0.1,
  },
  categorySection: {
    marginBottom: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  categoryNumber: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    letterSpacing: 1.5,
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  emptyState: {
    marginHorizontal: 24,
    padding: 40,
    borderRadius: 10,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
