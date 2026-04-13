import React, { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useFocusEffect, useRouter } from 'expo-router';
import { getStreak, getDailyStats, getQuizStats, getQuizResults, getDueCardCount } from '@/lib/database';
import { DailyStats } from '@/types';

export default function StatsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const [streak, setStreak] = useState(0);
  const [weeklyStats, setWeeklyStats] = useState<(DailyStats | null)[]>([]);
  const [quizStats, setQuizStats] = useState<{ totalQuizzes: number; avgAccuracy: number; bestCategory: string | null; worstCategory: string | null }>({ totalQuizzes: 0, avgAccuracy: 0, bestCategory: null, worstCategory: null });
  const [dueCount, setDueCount] = useState(0);
  const [recentQuizzes, setRecentQuizzes] = useState<{ pack_name: string; score: number; total: number; date: string }[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    const s = await getStreak();
    setStreak(s);

    const stats: (DailyStats | null)[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayStat = await getDailyStats(dateStr);
      stats.push(dayStat);
    }
    setWeeklyStats(stats);

    const qs = await getQuizStats();
    setQuizStats(qs);

    const today = new Date().toISOString().split('T')[0];
    // Count all due cards across all packs
    const dueCountResult = await getDueCardCount(today);
    setDueCount(dueCountResult);

    const recent = await getQuizResults(5);
    setRecentQuizzes(recent);
  };

  const totalReviewed = weeklyStats.reduce(
    (sum, s) => sum + (s?.cardsReviewed ?? 0), 0
  );
  const totalCorrect = weeklyStats.reduce(
    (sum, s) => sum + (s?.cardsCorrect ?? 0), 0
  );
  const reviewAccuracy = totalReviewed > 0
    ? Math.round((totalCorrect / totalReviewed) * 100)
    : 0;

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxReviewed = Math.max(
    ...weeklyStats.map((s) => s?.cardsReviewed ?? 0),
    1
  );

  // Suggested next action
  const suggestedAction = dueCount > 0
    ? { label: `Review ${dueCount} due card${dueCount === 1 ? '' : 's'}`, route: '/review/mix' as const }
    : quizStats.worstCategory
    ? { label: `Practice ${quizStats.worstCategory}`, route: '/(tabs)/quiz' as const }
    : { label: 'Browse packs', route: '/(tabs)/packs' as const };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>Progress</Text>

      {/* Big stats */}
      <View style={styles.bigStatsRow}>
        <View style={[styles.bigStat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.bigStatNumber, { color: colors.primary }]}>{streak}</Text>
          <Text style={[styles.bigStatLabel, { color: colors.textSecondary }]}>Streak</Text>
        </View>
        <View style={[styles.bigStat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.bigStatNumber, { color: colors.accent }]}>{reviewAccuracy}%</Text>
          <Text style={[styles.bigStatLabel, { color: colors.textSecondary }]}>Review Acc.</Text>
        </View>
        <View style={[styles.bigStat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.bigStatNumber, { color: colors.primary }]}>{dueCount}</Text>
          <Text style={[styles.bigStatLabel, { color: colors.textSecondary }]}>Due Now</Text>
        </View>
      </View>

      {/* Suggested next */}
      <Pressable
        onPress={() => router.push(suggestedAction.route)}
        style={({ pressed }) => [
          styles.suggestedCard,
          { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <Text style={styles.suggestedLabel}>Suggested Next</Text>
        <Text style={styles.suggestedAction}>{suggestedAction.label}</Text>
      </Pressable>

      {/* Weekly chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>This Week</Text>
        <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
          {totalReviewed} cards reviewed
        </Text>

        <View style={styles.chart}>
          {weeklyStats.map((stat, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - index));
            const dayName = DAYS[date.getDay()];
            const count = stat?.cardsReviewed ?? 0;
            const height = Math.max((count / maxReviewed) * 80, 4);

            return (
              <View key={index} style={styles.chartBar}>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        backgroundColor: count > 0 ? colors.primary : colors.border,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: colors.textSecondary }]}>
                  {dayName}
                </Text>
                {count > 0 && (
                  <Text style={[styles.barCount, { color: colors.text }]}>{count}</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Quiz stats */}
      {quizStats.totalQuizzes > 0 && (
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Quiz Performance</Text>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
            {quizStats.totalQuizzes} quiz{quizStats.totalQuizzes === 1 ? '' : 'zes'} completed · {Math.round(quizStats.avgAccuracy * 100)}% avg
          </Text>
          <View style={styles.quizStatsRow}>
            {quizStats.bestCategory && (
              <View style={styles.quizStatItem}>
                <Text style={[styles.quizStatValue, { color: colors.accent }]}>Strongest</Text>
                <Text style={[styles.quizStatName, { color: colors.text }]}>{quizStats.bestCategory}</Text>
              </View>
            )}
            {quizStats.worstCategory && quizStats.worstCategory !== quizStats.bestCategory && (
              <View style={styles.quizStatItem}>
                <Text style={[styles.quizStatValue, { color: colors.danger }]}>Weakest</Text>
                <Text style={[styles.quizStatName, { color: colors.text }]}>{quizStats.worstCategory}</Text>
              </View>
            )}
          </View>

          {recentQuizzes.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={[styles.recentTitle, { color: colors.textSecondary }]}>Recent</Text>
              {recentQuizzes.map((q, i) => (
                <View key={i} style={[styles.recentRow, { borderColor: colors.border }]}>
                  <Text style={[styles.recentPack, { color: colors.text }]} numberOfLines={1}>{q.pack_name}</Text>
                  <Text style={[styles.recentScore, { color: q.score / q.total >= 0.7 ? colors.accent : colors.danger }]}>
                    {q.score}/{q.total}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Motivation */}
      <View style={[styles.motivationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.motivationText, { color: colors.text }]}>
          {streak >= 7
            ? 'Amazing dedication — a week-long streak.'
            : streak >= 3
            ? 'Great consistency. Keep the momentum going.'
            : streak >= 1
            ? 'Nice start. Every day counts towards mastery.'
            : 'Start your first review to begin your streak.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter-Medium',
    letterSpacing: -0.3,
    marginBottom: 28,
  },
  bigStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  bigStat: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  bigStatNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Light',
    letterSpacing: -0.5,
  },
  bigStatLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  suggestedCard: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  suggestedLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  suggestedAction: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#FFF9F4',
    letterSpacing: 0.2,
  },
  chartCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  chartSubtitle: {
    fontSize: 12,
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    backgroundColor: 'transparent',
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  barContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  bar: {
    width: 18,
    borderRadius: 3,
    minHeight: 3,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  barCount: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  quizStatsRow: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: 'transparent',
    marginTop: 4,
  },
  quizStatItem: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  quizStatValue: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  quizStatName: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  recentSection: {
    marginTop: 16,
    backgroundColor: 'transparent',
  },
  recentTitle: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  recentPack: {
    fontSize: 13,
    flex: 1,
    letterSpacing: 0.2,
  },
  recentScore: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
  },
  motivationCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  motivationText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.3,
  },
});
