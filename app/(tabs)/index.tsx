import React, { useState, useCallback } from 'react';
import { StyleSheet, Pressable, ScrollView, ActivityIndicator, RefreshControl, Platform, Linking } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useFocusEffect, useRouter } from 'expo-router';
import { getTotalDueCards, hasAnyReviewHistory, getStreak, getDailyStats, getAllPacks, getPackProgress } from '@/lib/database';
import { loadAllPacks, getAllPackData } from '@/lib/packs';
import { fetchTopTechNews, NewsStory } from '@/lib/news';
import { getDailyReviewQuestions } from '@/lib/quizSelection';
import { QuizQuestion } from '@/types';
import QuickQuiz from '@/components/QuickQuiz';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const [dueCards, setDueCards] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [hasHistory, setHasHistory] = useState(false);
  const [streak, setStreak] = useState(0);
  const [todayActive, setTodayActive] = useState(false);
  const [dailyReviewCount, setDailyReviewCount] = useState(0);
  const [news, setNews] = useState<NewsStory[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [expandedStory, setExpandedStory] = useState<number | null>(null);
  const [showAllNews, setShowAllNews] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      await loadAllPacks();
      const d = await getTotalDueCards();
      setDueCards(d);
      const history = await hasAnyReviewHistory();
      setHasHistory(history);
      const packs = getAllPackData();
      setTotalCards(packs.reduce((sum, p) => sum + p.cards.length, 0));
      const s = await getStreak();
      setStreak(s);
      const today = new Date().toISOString().split('T')[0];
      const todayStats = await getDailyStats(today);
      setTodayActive(
        todayStats !== null &&
        ((todayStats.cardsReviewed ?? 0) > 0 || (todayStats.quizzesCompleted ?? 0) > 0)
      );

      // Load daily review count from all quiz packs
      try {
        let allQuizQuestions: QuizQuestion[] = [];
        const quizFiles = [
          require('@/data/quizzes/code-review.json'),
          require('@/data/quizzes/code-review-advanced.json'),
          require('@/data/quizzes/system-design.json'),
        ];
        try { quizFiles.push(require('@/data/quizzes/debugging-scenarios.json')); } catch {}
        try { quizFiles.push(require('@/data/quizzes/best-practices.json')); } catch {}
        for (const file of quizFiles) {
          if (file?.questions) allQuizQuestions = [...allQuizQuestions, ...file.questions];
        }
        const reviewQs = await getDailyReviewQuestions(allQuizQuestions, 10);
        setDailyReviewCount(reviewQs.length);
      } catch {}
    } catch (err) {
      console.error('Failed to load home data:', err);
    }

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

  const toggleStory = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedStory(expandedStory === id ? null : id);
  };

  const PACK_CATEGORIES: Record<string, string> = {
    'js-fundamentals': 'Core Skills', 'css-layout': 'Core Skills',
    'typescript-essentials': 'Core Skills', 'web-performance': 'Core Skills',
    'authentication': 'Core Skills',
    'react-patterns': 'Advanced', 'react-advanced': 'Advanced',
    'typescript-advanced': 'Advanced', 'build-tools': 'Advanced',
    'code-review': 'Senior Level', 'code-review-advanced': 'Senior Level',
    'system-design-fe': 'Senior Level', 'frontend-architecture': 'Senior Level',
    'authentication-advanced': 'Senior Level',
  };

  const handleSurpriseMe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const allPacks = await getAllPacks();
      const withProgress = await Promise.all(
        allPacks.map(async (p) => ({ ...p, ...(await getPackProgress(p.id)) }))
      );
      // Priority: due cards → unfinished core skills → any unfinished → random
      const due = withProgress.filter(p => p.dueCards > 0);
      if (due.length > 0) {
        router.push(`/review/${due[Math.floor(Math.random() * due.length)].id}`);
        return;
      }
      const core = withProgress.filter(p => PACK_CATEGORIES[p.id] === 'Core Skills' && p.learnedCards < p.totalCards);
      if (core.length > 0) {
        router.push(`/review/${core[Math.floor(Math.random() * core.length)].id}`);
        return;
      }
      const unfinished = withProgress.filter(p => p.learnedCards < p.totalCards);
      const pool = unfinished.length > 0 ? unfinished : withProgress;
      if (pool.length > 0) {
        router.push(`/review/${pool[Math.floor(Math.random() * pool.length)].id}`);
      }
    } catch (err) {
      console.error('Surprise me failed:', err);
      router.push('/(tabs)/packs');
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Hero — due count + review CTA */}
      <Text style={[styles.greeting, { color: colors.textSecondary }]}>
        {getGreeting()}
      </Text>

      {/* Streak indicator */}
      {(streak > 0 || todayActive) && (
        <View style={[styles.streakRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.streakNumber, { color: colors.primary }]}>{streak}</Text>
          <View style={styles.streakTextWrap}>
            <Text style={[styles.streakCount, { color: colors.text }]}>
              day streak
            </Text>
            <Text style={[styles.streakHint, { color: todayActive ? colors.accent : colors.textSecondary }]}>
              {todayActive ? 'Active today' : 'Study or quiz to keep it going'}
            </Text>
          </View>
        </View>
      )}

      {/* New user — clear getting started */}
      {!hasHistory && (
        <View style={[styles.getStarted, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.getStartedTitle, { color: colors.text }]}>
            Ready to start learning?
          </Text>
          <Text style={[styles.getStartedSub, { color: colors.textSecondary }]}>
            Pick how you want to begin
          </Text>
          <View style={styles.getStartedActions}>
            <Pressable
              onPress={handleSurpriseMe}
              style={({ pressed }) => [
                styles.getStartedBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.getStartedBtnLabel}>Surprise me</Text>
              <Text style={[styles.getStartedBtnHint, { color: 'rgba(255,255,255,0.8)' }]}>Pick a random pack</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/quiz')}
              style={({ pressed }) => [
                styles.getStartedBtn,
                { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.getStartedBtnLabel}>Take a quiz</Text>
              <Text style={[styles.getStartedBtnHint, { color: 'rgba(255,255,255,0.8)' }]}>Test what you know</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/packs')}>
            <Text style={[styles.browsePacks, { color: colors.primary }]}>
              Or browse all {totalCards} cards by topic
            </Text>
          </Pressable>
        </View>
      )}

      {/* Returning user — due cards or caught up */}
      {hasHistory && dueCards > 0 && (
        <Pressable
          onPress={() => router.push('/review/mix')}
          style={({ pressed }) => [
            styles.heroCta,
            { backgroundColor: colors.surface, borderColor: pressed ? colors.primary : colors.border },
          ]}
        >
          <Text style={[styles.heroCount, { color: colors.primary }]}>{dueCards}</Text>
          <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>cards due — tap to review</Text>
        </Pressable>
      )}

      {hasHistory && dueCards === 0 && (
        <View style={[styles.caughtUp, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.caughtUpText, { color: colors.accent }]}>All caught up</Text>
        </View>
      )}

      {/* Actions — always visible for returning users */}
      {hasHistory && (
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleSurpriseMe}
            style={({ pressed }) => [
              styles.actionCard,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.actionCardLabel, { color: colors.text }]}>Surprise me</Text>
            <Text style={[styles.actionCardHint, { color: colors.textSecondary }]}>Random cards</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/quiz')}
            style={({ pressed }) => [
              styles.actionCard,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.actionCardLabel, { color: colors.text }]}>Take a quiz</Text>
            <Text style={[styles.actionCardHint, { color: colors.textSecondary }]}>Test yourself</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/packs')}
            style={({ pressed }) => [
              styles.actionCard,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.actionCardLabel, { color: colors.text }]}>Browse packs</Text>
            <Text style={[styles.actionCardHint, { color: colors.textSecondary }]}>Pick a topic</Text>
          </Pressable>
        </View>
      )}

      {/* Quick Quiz — compact inline */}
      <QuickQuiz colors={colors} colorScheme={colorScheme} />

      {/* Daily Review — missed questions to revisit */}
      {dailyReviewCount > 0 && (
        <Pressable
          onPress={() => router.push({ pathname: '/(tabs)/quiz', params: { mode: 'review' } })}
          style={({ pressed }) => [
            styles.dailyReview,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={styles.dailyReviewRow}>
            <View style={styles.dailyReviewTextWrap}>
              <Text style={[styles.dailyReviewTitle, { color: colors.text }]}>Daily Review</Text>
              <Text style={[styles.dailyReviewSub, { color: colors.textSecondary }]}>
                {dailyReviewCount} question{dailyReviewCount !== 1 ? 's' : ''} to reinforce
              </Text>
            </View>
            <Text style={[styles.dailyReviewAction, { color: colors.primary }]}>Start</Text>
          </View>
        </Pressable>
      )}

      {/* News — compact headline list */}
      <View style={styles.newsSection}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          TODAY IN TECH
        </Text>
        {newsLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
        ) : news.length > 0 ? (
          <>
            {(showAllNews ? news : news.slice(0, 2)).map((story) => (
              <View key={story.id} style={[styles.newsItem, { borderColor: colors.border }]}>
                <Pressable
                  onPress={(e: any) => {
                    if (Platform.OS === 'web' && (e?.ctrlKey || e?.metaKey)) {
                      window.open(story.url, '_blank');
                    } else {
                      toggleStory(story.id);
                    }
                  }}
                >
                  <Text style={[styles.newsTitle, { color: colors.text }]} numberOfLines={2}>
                    {story.title}
                  </Text>
                  <View style={styles.newsMeta}>
                    <Text style={[styles.newsSource, { color: colors.primary }]}>{story.source}</Text>
                    <Text style={[styles.newsDot, { color: colors.textSecondary }]}>·</Text>
                    <Text style={[styles.newsMetaText, { color: colors.textSecondary }]}>
                      {story.score} pts
                    </Text>
                  </View>
                </Pressable>
                {expandedStory === story.id && story.summary ? (
                  <View style={[styles.summaryBox, { backgroundColor: colors.surface }]}>  
                    {story.summary.split('\n').map((line, i) => (
                      <Text key={i} style={[styles.summaryLine, { color: colors.textSecondary }]}>
                        {line}
                      </Text>
                    ))}
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (Platform.OS === 'web') {
                          window.open(story.url, '_blank');
                        } else {
                          WebBrowser.openBrowserAsync(story.url);
                        }
                      }}
                    >
                      <Text style={[styles.readLink, { color: colors.primary }]}>Read article</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
            {!showAllNews && news.length > 2 && (
              <Pressable onPress={() => setShowAllNews(true)}>
                <Text style={[styles.readLink, { color: colors.primary, marginTop: 8 }]}>
                  +{news.length - 2} more stories
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <Text style={[styles.newsEmpty, { color: colors.textSecondary }]}>
            Couldn't load news
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 48,
  },
  greeting: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 20,
    fontFamily: 'Inter-Regular',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  streakNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Light',
    letterSpacing: -0.5,
    minWidth: 32,
    textAlign: 'center',
  },
  streakTextWrap: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  streakCount: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
  streakHint: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  dailyReview: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  dailyReviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  dailyReviewTextWrap: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dailyReviewTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
  dailyReviewSub: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  dailyReviewAction: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  heroCta: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroCount: {
    fontSize: 40,
    fontFamily: 'Inter-Light',
    letterSpacing: -1,
  },
  heroLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  caughtUp: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  caughtUpText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
  getStarted: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  getStartedTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  getStartedSub: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 20,
  },
  getStartedActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    backgroundColor: 'transparent',
  },
  getStartedBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  getStartedBtnLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#fff',
  },
  getStartedBtnHint: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  browsePacks: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    marginTop: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  actionCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  actionCardLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  actionCardHint: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    letterSpacing: 2,
    marginBottom: 14,
  },
  newsSection: {
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  newsItem: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  newsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    lineHeight: 20,
    marginBottom: 6,
  },
  newsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  newsSource: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  newsDot: {
    fontSize: 11,
    marginHorizontal: 6,
  },
  newsMetaText: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  summaryBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 8,
  },
  summaryLine: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 2,
  },
  readLink: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
    marginTop: 10,
  },
  newsEmpty: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
});
