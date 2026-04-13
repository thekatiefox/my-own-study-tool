import React, { useState, useCallback } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useFocusEffect, useRouter } from 'expo-router';
import { getAllPacks, getPackProgress } from '@/lib/database';
import { loadAllPacks } from '@/lib/packs';
import PackCard from '@/components/PackCard';

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

      {packs.map((pack) => (
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
    fontWeight: '800',
    marginBottom: 4,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  emptyState: {
    marginHorizontal: 24,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
});
