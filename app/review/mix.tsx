import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, ScrollView, Pressable, Animated, Alert, BackHandler, Platform } from 'react-native';
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
import { ReviewCard, Difficulty, DIFFICULTY_TO_QUALITY, CardProgress } from '@/types';

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
  const [undoState, setUndoState] = useState<{
    prevProgress: CardProgress | null;
    prevIndex: number;
    prevStats: { reviewed: number; correct: number };
  } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Back button guard
  useEffect(() => {
    if (isComplete || cards.length === 0) return;
    const onBackPress = () => {
      if (sessionStats.reviewed > 0) {
        Alert.alert(
          'Leave session?',
          `You've reviewed ${sessionStats.reviewed} cards. Progress is saved.`,
          [
            { text: 'Stay', style: 'cancel' },
            { text: 'Leave', style: 'destructive', onPress: () => router.back() },
          ]
        );
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [sessionStats.reviewed, isComplete, cards.length]);

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

  const clearUndo = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoState(null);
    Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  const handleUndo = async () => {
    if (!undoState) return;
    const card = cards[undoState.prevIndex];
    if (undoState.prevProgress) {
      await upsertCardProgress(undoState.prevProgress);
    }
    setCurrentIndex(undoState.prevIndex);
    setIsFlipped(false);
    setIsComplete(false);
    setSessionStats(undoState.prevStats);
    clearUndo();
  };

  const handleRate = async (difficulty: Difficulty) => {
    const card = cards[currentIndex];
    if (!card) return;
    clearUndo();

    const quality = DIFFICULTY_TO_QUALITY[difficulty];
    const isNew = card.progress === null;
    const cardPackId = card.packId ?? card.progress?.packId ?? 'unknown';
    const currentProgress = card.progress ?? createInitialProgress(card.content.id, cardPackId);

    // Save undo state before mutating
    const prevStats = { ...sessionStats };
    setUndoState({
      prevProgress: card.progress ? { ...card.progress } : null,
      prevIndex: currentIndex,
      prevStats,
    });

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

    // Show undo toast
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start();
    undoTimer.current = setTimeout(clearUndo, 4000);

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
        <Text style={[styles.completeTitle, { color: colors.text }]}>
          {sessionStats.reviewed === 0 ? 'All caught up' : 'Session complete'}
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
      {isFlipped && (
        <DifficultyButtons
          onRate={handleRate}
          easeFactor={currentCard.progress?.easeFactor}
          interval={currentCard.progress?.interval}
          repetitions={currentCard.progress?.repetitions}
        />
      )}

      {/* Undo toast */}
      {undoState && (
        <Animated.View
          style={[
            styles.undoToast,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: toastOpacity },
          ]}
        >
          <Text style={[styles.undoText, { color: colors.textSecondary }]}>Rating saved</Text>
          <Pressable onPress={handleUndo}>
            <Text style={[styles.undoBtn, { color: colors.primary }]}>Undo</Text>
          </Pressable>
        </Animated.View>
      )}
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
    fontSize: 13,
    letterSpacing: 0.3,
  },
  progressHeader: {
    alignItems: 'center',
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  completeEmoji: {
    fontSize: 48,
    marginBottom: 20,
  },
  completeTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Medium',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  completeStats: {
    fontSize: 14,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  completeMessage: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 36,
  },
  doneButton: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#FFF9F4',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  undoToast: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  undoText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  undoBtn: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.3,
  },
});
