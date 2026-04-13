import React, { useState, useCallback } from 'react';
import { StyleSheet, Pressable, ScrollView, ActivityIndicator, RefreshControl, Platform, Linking } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useFocusEffect, useRouter } from 'expo-router';
import { getTotalDueCards, hasAnyReviewHistory, getStreak, getDailyStats } from '@/lib/database';
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
          <Text style={styles.streakFire}>{streak >= 7 ? '🔥' : '⚡'}</Text>
          <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <Text style={[styles.streakCount, { color: colors.text }]}>
              {streak} day streak{streak !== 1 ? '' : ''}
            </Text>
            <Text style={[styles.streakHint, { color: todayActive ? colors.accent : colors.textSecondary }]}>
              {todayActive ? '✓ active today' : 'Study or quiz to keep it going!'}
            </Text>
          </View>
        </View>
      )}

      <Pressable
        onPress={() => {
          if (dueCards > 0) {
            router.push('/review/mix');
          } else if (!hasHistory) {
            router.push('/(tabs)/packs');
          }
        }}
        style={({ pressed }) => [
          styles.heroCta,
          {
            backgroundColor: colors.surface,
            borderColor: pressed ? colors.primary : colors.border,
          },
        ]}
      >
        {dueCards > 0 ? (
          <>
            <Text style={[styles.heroCount, { color: colors.primary }]}>{dueCards}</Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>cards due — tap to review</Text>
          </>
        ) : hasHistory ? (
          <>
            <Text style={[styles.heroCount, { color: colors.accent }]}>✓</Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>all caught up — nice work</Text>
          </>
        ) : (
          <>
            <Text style={[styles.heroCount, { color: colors.primary }]}>{totalCards}</Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>cards available — pick a pack to start</Text>
          </>
        )}
      </Pressable>

      {/* Secondary CTAs when caught up */}
      {dueCards === 0 && hasHistory && (
        <View style={styles.secondaryCtas}>
          <Pressable
            onPress={() => router.push('/(tabs)/quiz')}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Take a quiz</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/packs')}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Browse packs</Text>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'transparent' }}>
            <Text style={{ fontSize: 22 }}>🔄</Text>
            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
              <Text style={[styles.dailyReviewTitle, { color: colors.text }]}>Daily Review</Text>
              <Text style={[styles.dailyReviewSub, { color: colors.textSecondary }]}>
                {dailyReviewCount} question{dailyReviewCount !== 1 ? 's' : ''} to reinforce
              </Text>
            </View>
            <Text style={{ fontSize: 16, color: colors.primary, fontFamily: 'Inter-SemiBold' }}>Start →</Text>
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
  streakFire: {
    fontSize: 28,
  },
  streakCount: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
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
  dailyReviewTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  dailyReviewSub: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  heroCta: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 24,
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
  secondaryCtas: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.3,
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
