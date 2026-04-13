import { supabase, supabaseConfigured } from '@/lib/supabase';
import { CardProgress, DailyStats } from '@/types';

// Sync user data between local SQLite and Supabase cloud.
// Strategy: local-first writes, background push to cloud.
// On login: pull cloud → merge with local (cloud wins for conflicts).

export async function pushCardProgress(userId: string, progress: CardProgress): Promise<void> {
  if (!supabaseConfigured) return;
  try {
    await supabase.from('card_progress').upsert({
      user_id: userId,
      card_id: progress.cardId,
      pack_id: progress.packId,
      ease_factor: progress.easeFactor,
      interval: progress.interval,
      repetitions: progress.repetitions,
      next_review_date: progress.nextReviewDate,
      last_review_date: progress.lastReviewDate,
    }, { onConflict: 'user_id,card_id' });
  } catch (e) {
    console.warn('[sync] pushCardProgress failed:', e);
  }
}

export async function pushDailyStats(userId: string, date: string, stats: DailyStats): Promise<void> {
  if (!supabaseConfigured) return;
  try {
    await supabase.from('daily_stats').upsert({
      user_id: userId,
      date,
      cards_reviewed: stats.cardsReviewed,
      cards_correct: stats.cardsCorrect,
      new_cards_seen: stats.newCardsSeen,
    }, { onConflict: 'user_id,date' });
  } catch (e) {
    console.warn('[sync] pushDailyStats failed:', e);
  }
}

export async function pushQuizResult(
  userId: string,
  packName: string,
  score: number,
  total: number,
  date: string,
): Promise<void> {
  if (!supabaseConfigured) return;
  try {
    await supabase.from('quiz_results').insert({
      user_id: userId,
      pack_name: packName,
      score,
      total,
      date,
    });
  } catch (e) {
    console.warn('[sync] pushQuizResult failed:', e);
  }
}

export interface CloudCardProgress {
  card_id: string;
  pack_id: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
  last_review_date: string;
}

export async function pullAllProgress(userId: string): Promise<CloudCardProgress[]> {
  if (!supabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('card_progress')
      .select('card_id, pack_id, ease_factor, interval, repetitions, next_review_date, last_review_date')
      .eq('user_id', userId);
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.warn('[sync] pullAllProgress failed:', e);
    return [];
  }
}

export async function pullDailyStats(userId: string, days = 30): Promise<{ date: string; cards_reviewed: number; cards_correct: number; new_cards_seen: number }[]> {
  if (!supabaseConfigured) return [];
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data, error } = await supabase
      .from('daily_stats')
      .select('date, cards_reviewed, cards_correct, new_cards_seen')
      .eq('user_id', userId)
      .gte('date', since.toISOString().split('T')[0])
      .order('date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.warn('[sync] pullDailyStats failed:', e);
    return [];
  }
}

export async function pullQuizResults(userId: string, limit = 50): Promise<{ pack_name: string; score: number; total: number; date: string }[]> {
  if (!supabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('quiz_results')
      .select('pack_name, score, total, date')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.warn('[sync] pullQuizResults failed:', e);
    return [];
  }
}
