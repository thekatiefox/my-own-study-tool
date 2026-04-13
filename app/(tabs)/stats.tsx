import React, { useState, useCallback } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useFocusEffect } from 'expo-router';
import { getStreak, getDailyStats } from '@/lib/database';
import { DailyStats } from '@/types';

export default function StatsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [streak, setStreak] = useState(0);
  const [weeklyStats, setWeeklyStats] = useState<(DailyStats | null)[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    const s = await getStreak();
    setStreak(s);

    // Load last 7 days of stats
    const stats: (DailyStats | null)[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayStat = await getDailyStats(dateStr);
      stats.push(dayStat);
    }
    setWeeklyStats(stats);
  };

  const totalReviewed = weeklyStats.reduce(
    (sum, s) => sum + (s?.cardsReviewed ?? 0), 0
  );
  const totalCorrect = weeklyStats.reduce(
    (sum, s) => sum + (s?.cardsCorrect ?? 0), 0
  );
  const accuracy = totalReviewed > 0
    ? Math.round((totalCorrect / totalReviewed) * 100)
    : 0;

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxReviewed = Math.max(
    ...weeklyStats.map((s) => s?.cardsReviewed ?? 0),
    1
  );

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>Your Progress</Text>

      {/* Big stats */}
      <View style={styles.bigStatsRow}>
        <View style={[styles.bigStat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.bigStatEmoji}>🔥</Text>
          <Text style={[styles.bigStatNumber, { color: colors.primary }]}>{streak}</Text>
          <Text style={[styles.bigStatLabel, { color: colors.textSecondary }]}>Day Streak</Text>
        </View>
        <View style={[styles.bigStat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.bigStatEmoji}>🎯</Text>
          <Text style={[styles.bigStatNumber, { color: colors.accent }]}>{accuracy}%</Text>
          <Text style={[styles.bigStatLabel, { color: colors.textSecondary }]}>Accuracy</Text>
        </View>
      </View>

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

      {/* Motivation */}
      <View style={[styles.motivationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={styles.motivationEmoji}>
          {streak >= 7 ? '🏆' : streak >= 3 ? '⭐' : '🌱'}
        </Text>
        <Text style={[styles.motivationText, { color: colors.text }]}>
          {streak >= 7
            ? 'Amazing dedication! A week-long streak!'
            : streak >= 3
            ? 'Great consistency! Keep the momentum going!'
            : streak >= 1
            ? 'Nice start! Every day counts towards mastery.'
            : 'Start your first review to begin your streak!'}
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
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 20,
  },
  bigStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  bigStat: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  bigStatEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  bigStatNumber: {
    fontSize: 36,
    fontWeight: '800',
  },
  bigStatLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  chartSubtitle: {
    fontSize: 13,
    marginBottom: 16,
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
    width: 20,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 11,
    marginTop: 6,
  },
  barCount: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  motivationCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  motivationEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  motivationText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
