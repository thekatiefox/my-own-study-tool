import React, { useState, useCallback } from 'react';
import { StyleSheet, Pressable, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useFocusEffect, useRouter } from 'expo-router';
import { getTotalDueCards, hasAnyReviewHistory } from '@/lib/database';
import { loadAllPacks, getAllPackData } from '@/lib/packs';
import { fetchTopTechNews, NewsStory } from '@/lib/news';
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
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>cards due for review</Text>
          </>
        ) : hasHistory ? (
          <>
            <Text style={[styles.heroCount, { color: colors.accent }]}>0</Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>all caught up — nice work</Text>
          </>
        ) : (
          <>
            <Text style={[styles.heroCount, { color: colors.primary }]}>{totalCards}</Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>cards to explore</Text>
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
                <Pressable onPress={() => toggleStory(story.id)}>
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
                        WebBrowser.openBrowserAsync(story.url);
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
