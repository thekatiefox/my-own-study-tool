import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Pressable, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useFocusEffect, useRouter } from 'expo-router';
import { getStreak, getTotalDueCards, getDailyStats } from '@/lib/database';
import { loadAllPacks } from '@/lib/packs';
import { fetchTopTechNews, NewsStory } from '@/lib/news';
import NewsCard from '@/components/NewsCard';
import QuickQuiz from '@/components/QuickQuiz';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const [streak, setStreak] = useState(0);
  const [dueCards, setDueCards] = useState(0);
  const [todayReviewed, setTodayReviewed] = useState(0);
  const [news, setNews] = useState<NewsStory[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      await loadAllPacks();
      const today = new Date().toISOString().split('T')[0];
      const [s, d, stats] = await Promise.all([
        getStreak(),
        getTotalDueCards(),
        getDailyStats(today),
      ]);
      setStreak(s);
      setDueCards(d);
      setTodayReviewed(stats?.cardsReviewed ?? 0);
    } catch (err) {
      console.error('Failed to load home data:', err);
    } finally {
      setIsLoading(false);
    }

    // Fetch news in background (non-blocking)
    fetchTopTechNews(3)
      .then(setNews)
      .finally(() => setNewsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setNewsLoading(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleStartReview = () => {
    router.push('/review/mix');
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Greeting */}
      <Text style={[styles.greeting, { color: colors.textSecondary }]}>
        {getGreeting()} 👋
      </Text>
      <Text style={[styles.title, { color: colors.text }]}>
        Ready to learn?
      </Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{streak}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>day streak</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.statEmoji}>📚</Text>
          <Text style={[styles.statNumber, { color: colors.accent }]}>{dueCards}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>cards due</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.statEmoji}>✅</Text>
          <Text style={[styles.statNumber, { color: colors.text }]}>{todayReviewed}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>today</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={handleStartReview}
          style={({ pressed }) => [
            styles.actionCard,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.actionEmoji}>📚</Text>
          <Text style={styles.actionLabel}>Daily Cards</Text>
          <Text style={styles.actionSub}>
            {dueCards > 0 ? `${dueCards} due` : 'Review'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(tabs)/quiz')}
          style={({ pressed }) => [
            styles.actionCard,
            {
              backgroundColor: colors.accent,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.actionEmoji}>🧩</Text>
          <Text style={styles.actionLabel}>Quiz Packs</Text>
          <Text style={styles.actionSub}>Scenarios</Text>
        </Pressable>
      </View>

      {/* Inline Quick Quiz */}
      <QuickQuiz colors={colors} colorScheme={colorScheme} />

      {/* Motivational section */}
      <View style={[styles.tipCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.tipTitle, { color: colors.primary }]}>💡 Daily Tip</Text>
        <Text style={[styles.tipText, { color: colors.text }]}>
          {getDailyTip()}
        </Text>
      </View>

      {/* Tech News section */}
      <View style={styles.newsSection}>
        <Text style={[styles.newsSectionTitle, { color: colors.text }]}>
          📰 Today in Tech
        </Text>
        <Text style={[styles.newsSectionSubtitle, { color: colors.textSecondary }]}>
          Top stories from Hacker News
        </Text>
        {newsLoading ? (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={{ marginTop: 16 }}
          />
        ) : news.length > 0 ? (
          news.map((story) => (
            <NewsCard key={story.id} story={story} colors={colors} />
          ))
        ) : (
          <Text style={[styles.newsEmpty, { color: colors.textSecondary }]}>
            Couldn't load news — check your connection
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const TIPS = [
  'Spaced repetition is most effective when you review daily — even 5 minutes helps!',
  'Senior devs don\'t memorize everything — they build strong mental models of core concepts.',
  'Understanding "why" something works is more valuable than memorizing "how".',
  'Try explaining each card\'s answer out loud — teaching solidifies understanding.',
  'Consistency beats intensity. Short daily sessions outperform weekly cram sessions.',
  'If a card feels too easy, that\'s the spaced repetition working. Trust the algorithm!',
  'Focus on patterns, not syntax. Patterns transfer across languages and frameworks.',
];

function getDailyTip(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return TIPS[dayOfYear % TIPS.length];
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 28,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  actionCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#B8845C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  actionEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  actionLabel: {
    color: '#FFF9F4',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  actionSub: {
    color: 'rgba(255,249,244,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  tipCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 21,
  },
  newsSection: {
    marginTop: 24,
    backgroundColor: 'transparent',
  },
  newsSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  newsSectionSubtitle: {
    fontSize: 13,
    marginBottom: 14,
  },
  newsEmpty: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
});
