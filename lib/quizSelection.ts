import { QuizQuestion } from '@/types';
import { getQuizQuestionProgressMap } from '@/lib/database';

/**
 * Smart quiz question selection.
 * Priority order:
 * 1. Never seen questions (highest priority)
 * 2. Previously missed questions (got wrong recently, streak = 0)
 * 3. Stale questions (not seen in 7+ days)
 * 4. Mastered questions (3+ correct streak — lowest priority)
 *
 * Within each tier, questions are shuffled randomly.
 * Questions with high correct streaks are heavily deprioritized.
 */
export async function selectSmartQuestions(
  allQuestions: QuizQuestion[],
  count: number
): Promise<QuizQuestion[]> {
  const progressMap = await getQuizQuestionProgressMap();
  const today = new Date().toISOString().split('T')[0];

  // Score each question (lower = higher priority to show)
  const scored = allQuestions.map((q) => {
    const prog = progressMap.get(q.id);

    if (!prog || prog.timesSeen === 0) {
      // Never seen — highest priority
      return { question: q, score: 0 };
    }

    const accuracy = prog.timesCorrect / prog.timesSeen;
    const daysSinceLastSeen = prog.lastSeenDate
      ? Math.floor((new Date(today).getTime() - new Date(prog.lastSeenDate).getTime()) / 86400000)
      : 999;

    // Got it wrong recently (streak broken)
    if (prog.streak === 0) {
      return { question: q, score: 10 - Math.min(daysSinceLastSeen, 5) };
    }

    // Stale — haven't seen in a while
    if (daysSinceLastSeen >= 7) {
      return { question: q, score: 20 - Math.min(daysSinceLastSeen / 7, 5) };
    }

    // Mastered — high streak, seen recently → deprioritize heavily
    // streak of 3+ with 80%+ accuracy = very low priority
    if (prog.streak >= 3 && accuracy >= 0.8) {
      return { question: q, score: 100 + prog.streak * 10 };
    }

    // Middle ground — seen, somewhat accurate
    return { question: q, score: 30 + accuracy * 20 };
  });

  // Shuffle within similar scores (add small random noise)
  const withNoise = scored.map((s) => ({
    ...s,
    sortKey: s.score + Math.random() * 5,
  }));

  withNoise.sort((a, b) => a.sortKey - b.sortKey);

  return withNoise.slice(0, Math.min(count, withNoise.length)).map((s) => s.question);
}
