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
}

export interface PackWithProgress {
  pack: Pack;
  totalCards: number;
  learnedCards: number; // cards reviewed at least once
  dueCards: number; // cards due for review today
}
