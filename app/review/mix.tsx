import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useRouter } from 'expo-router';
import FlashCard from '@/components/FlashCard';
import DifficultyButtons from '@/components/DifficultyButtons';
import ProgressBar from '@/components/ProgressBar';
import { buildMixedReviewQueue } from '@/lib/scheduler';
import { calculateSM2, createInitialProgress } from '@/lib/sm2';
import { upsertCardProgress, recordReview } from '@/lib/database';
import { ReviewCard, Difficulty, DIFFICULTY_TO_QUALITY } from '@/types';

export default function MixedReviewScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const queue = await buildMixedReviewQueue();
      setCards(queue);
      setIsLoading(false);

      if (queue.length === 0) {
        setIsComplete(true);
      }
    } catch (err) {
      console.error('Failed to load mixed review queue:', err);
      setIsLoading(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleRate = async (difficulty: Difficulty) => {
    const card = cards[currentIndex];
    if (!card) return;

    const quality = DIFFICULTY_TO_QUALITY[difficulty];
    const isNew = card.progress === null;
    const cardPackId = card.packId ?? card.progress?.packId ?? 'unknown';
    const currentProgress = card.progress ?? createInitialProgress(card.content.id, cardPackId);

    // Calculate new SM-2 values
    const result = calculateSM2({
      quality,
      easeFactor: currentProgress.easeFactor,
      interval: currentProgress.interval,
      repetitions: currentProgress.repetitions,
    });

    // Save progress
    await upsertCardProgress({
      cardId: card.content.id,
      packId: cardPackId,
      easeFactor: result.easeFactor,
      interval: result.interval,
      repetitions: result.repetitions,
      nextReviewDate: result.nextReviewDate,
      lastReviewDate: new Date().toISOString().split('T')[0],
    });

    // Record daily stats
    const correct = quality >= 3;
    await recordReview(correct, isNew);

    // Update session stats
    setSessionStats((prev) => ({
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (correct ? 1 : 0),
    }));

    // Move to next card
    if (currentIndex + 1 < cards.length) {
      setIsFlipped(false);
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsComplete(true);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading cards...
        </Text>
      </View>
    );
  }

  if (isComplete) {
    const accuracy = sessionStats.reviewed > 0
      ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
      : 0;

    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={styles.completeEmoji}>🎉</Text>
        <Text style={[styles.completeTitle, { color: colors.text }]}>
          {sessionStats.reviewed === 0 ? 'All caught up!' : 'Session Complete!'}
        </Text>
        {sessionStats.reviewed > 0 && (
          <>
            <Text style={[styles.completeStats, { color: colors.textSecondary }]}>
              {sessionStats.reviewed} cards reviewed · {accuracy}% accuracy
            </Text>
          </>
        )}
        <Text style={[styles.completeMessage, { color: colors.textSecondary }]}>
          {sessionStats.reviewed === 0
            ? 'No cards are due for review right now. Check back later!'
            : 'Great work! Your brain is building stronger connections.'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.doneButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Progress */}
      <View style={styles.progressHeader}>
        <Text style={[styles.headerLabel, { color: colors.primary }]}>Mixed Review</Text>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {currentIndex + 1} / {cards.length}
        </Text>
      </View>
      <ProgressBar current={currentIndex + 1} total={cards.length} />

      {/* Card */}
      <ScrollView
        contentContainerStyle={styles.cardContainer}
        showsVerticalScrollIndicator={false}
      >
        <FlashCard
          card={currentCard.content}
          isFlipped={isFlipped}
          onFlip={handleFlip}
        />
      </ScrollView>

      {/* Rating buttons (only shown when flipped) */}
      {isFlipped && <DifficultyButtons onRate={handleRate} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
  },
  progressHeader: {
    alignItems: 'center',
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  completeEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  completeStats: {
    fontSize: 16,
    marginBottom: 8,
  },
  completeMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  doneButton: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 14,
  },
  doneButtonText: {
    color: '#FFF9F4',
    fontSize: 16,
    fontWeight: '600',
  },
});
