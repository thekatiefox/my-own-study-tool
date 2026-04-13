import { SM2Input, SM2Output } from '@/types';

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

/**
 * SM-2 spaced repetition algorithm.
 * Given current state and a quality rating (0-5), returns the new scheduling state.
 *
 * Quality ratings:
 *   0 - Complete blackout
 *   1 - Incorrect, but recalled upon seeing answer
 *   2 - Incorrect, but answer seemed easy to recall
 *   3 - Correct with serious difficulty
 *   4 - Correct with some hesitation
 *   5 - Perfect response
 */
export function calculateSM2(input: SM2Input): SM2Output {
  const { quality, easeFactor, interval, repetitions } = input;

  let newEaseFactor: number;
  let newInterval: number;
  let newRepetitions: number;

  if (quality < 3) {
    // Failed recall — reset repetitions, short interval
    newRepetitions = 0;
    newInterval = 1;
    newEaseFactor = easeFactor; // keep ease factor unchanged on failure
  } else {
    // Successful recall
    newRepetitions = repetitions + 1;

    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }

    // Update ease factor based on quality
    newEaseFactor =
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  }

  // Enforce minimum ease factor
  newEaseFactor = Math.max(MIN_EASE_FACTOR, newEaseFactor);

  // Calculate next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);
  const nextReviewDate = nextReview.toISOString().split('T')[0];

  return {
    easeFactor: Math.round(newEaseFactor * 100) / 100,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewDate,
  };
}

export function createInitialProgress(
  cardId: string,
  packId: string
): {
  cardId: string;
  packId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewDate: null;
} {
  return {
    cardId,
    packId,
    easeFactor: DEFAULT_EASE_FACTOR,
    interval: 0,
    repetitions: 0,
    nextReviewDate: new Date().toISOString().split('T')[0],
    lastReviewDate: null,
  };
}

/**
 * Preview what interval each difficulty rating would produce
 * WITHOUT mutating any state. Used for DifficultyButtons labels.
 */
export function previewIntervals(
  easeFactor: number,
  interval: number,
  repetitions: number
): Record<string, number> {
  const results: Record<string, number> = {};
  const qualities: Record<string, number> = {
    again: 1,
    hard: 3,
    good: 4,
    easy: 5,
  };

  for (const [key, quality] of Object.entries(qualities)) {
    const out = calculateSM2({ quality, easeFactor, interval, repetitions });
    results[key] = out.interval;
  }
  return results;
}

export function formatInterval(days: number): string {
  if (days < 1) return '<1m';
  if (days === 1) return '1d';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

export { DEFAULT_EASE_FACTOR, MIN_EASE_FACTOR };
