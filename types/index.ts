// Core data types for the study tool

export interface Pack {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  cards: CardContent[];
}

export interface CardContent {
  id: string;
  front: string;
  back: string;
  tags: string[];
}

export interface CardProgress {
  cardId: string;
  packId: string;
  easeFactor: number;
  interval: number; // days
  repetitions: number;
  nextReviewDate: string; // ISO date string
  lastReviewDate: string | null;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  cardsReviewed: number;
  cardsCorrect: number;
  newCardsSeen: number;
}

export interface SM2Input {
  quality: number; // 0-5 rating
  easeFactor: number;
  interval: number;
  repetitions: number;
}

export interface SM2Output {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
}

export type Difficulty = 'again' | 'hard' | 'good' | 'easy';

export const DIFFICULTY_TO_QUALITY: Record<Difficulty, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

export interface ReviewSession {
  packId: string;
  cards: ReviewCard[];
  currentIndex: number;
  startedAt: string;
}

export interface ReviewCard {
  content: CardContent;
  progress: CardProgress | null; // null = new card
  isFlipped: boolean;
  packId?: string; // For mixed reviews — which pack this card belongs to
}

export interface PackWithProgress {
  pack: Pack;
  totalCards: number;
  learnedCards: number; // cards reviewed at least once
  dueCards: number; // cards due for review today
}

export interface QuizQuestion {
  id: string;
  scenario: string;      // The situation/code shown to the user
  question: string;       // What's being asked
  options: string[];      // 4 multiple choice options
  correctIndex: number;   // Index of the correct answer (0-based)
  explanation: string;    // Why the correct answer is right
  optionExplanations?: string[]; // Why each wrong option is wrong (same indexes as options)
  category: string;       // Which topic area
  difficulty: 'beginner' | 'intermediate' | 'senior';
}

export interface QuizPack {
  id: string;
  name: string;
  description: string;
  icon: string;
  questions: QuizQuestion[];
}
