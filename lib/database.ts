import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { CardProgress, DailyStats, Pack } from '@/types';
import { pushCardProgress, pushDailyStats, pushQuizResult } from '@/lib/sync';

let db: SQLite.SQLiteDatabase | null = null;
const isWeb = Platform.OS === 'web';

// Set by auth layer when user signs in — enables cloud sync
let _currentUserId: string | null = null;
export function setCurrentUserId(userId: string | null) {
  _currentUserId = userId;
}

// --- In-memory web fallback storage ---
const memPacks: Map<string, { id: string; name: string; description: string; icon: string; category: string; card_count: number }> = new Map();
const memCards: Map<string, { id: string; pack_id: string; front: string; back: string; tags: string }> = new Map();
const memProgress: Map<string, CardProgress> = new Map();
const memStats: Map<string, DailyStats> = new Map();

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (isWeb) {
    // Return a dummy — all web calls use mem* maps instead
    return null as unknown as SQLite.SQLiteDatabase;
  }
  if (!db) {
    db = await SQLite.openDatabaseAsync('studytool.db');
    await runMigrations(db);
  }
  return db;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS packs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      category TEXT NOT NULL,
      card_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      pack_id TEXT NOT NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (pack_id) REFERENCES packs(id)
    );

    CREATE TABLE IF NOT EXISTS card_progress (
      card_id TEXT PRIMARY KEY,
      pack_id TEXT NOT NULL,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      interval INTEGER NOT NULL DEFAULT 0,
      repetitions INTEGER NOT NULL DEFAULT 0,
      next_review_date TEXT NOT NULL,
      last_review_date TEXT,
      FOREIGN KEY (card_id) REFERENCES cards(id)
    );

    CREATE TABLE IF NOT EXISTS daily_stats (
      date TEXT PRIMARY KEY,
      cards_reviewed INTEGER NOT NULL DEFAULT 0,
      cards_correct INTEGER NOT NULL DEFAULT 0,
      new_cards_seen INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS quiz_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pack_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      date TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cards_pack ON cards(pack_id);
    CREATE INDEX IF NOT EXISTS idx_progress_next_review ON card_progress(next_review_date);
    CREATE INDEX IF NOT EXISTS idx_progress_pack ON card_progress(pack_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_results_date ON quiz_results(date);
  `);
}

// --- Pack Operations ---

export async function loadPackIntoDb(pack: Pack): Promise<void> {
  if (isWeb) {
    memPacks.set(pack.id, {
      id: pack.id, name: pack.name, description: pack.description,
      icon: pack.icon, category: pack.category, card_count: pack.cards.length,
    });
    for (const card of pack.cards) {
      memCards.set(card.id, {
        id: card.id, pack_id: pack.id, front: card.front, back: card.back, tags: JSON.stringify(card.tags),
      });
    }
    return;
  }
  const database = await getDatabase();

  await database.runAsync(
    `INSERT OR REPLACE INTO packs (id, name, description, icon, category, card_count)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [pack.id, pack.name, pack.description, pack.icon, pack.category, pack.cards.length]
  );

  for (const card of pack.cards) {
    await database.runAsync(
      `INSERT OR REPLACE INTO cards (id, pack_id, front, back, tags)
       VALUES (?, ?, ?, ?, ?)`,
      [card.id, pack.id, card.front, card.back, JSON.stringify(card.tags)]
    );
  }
}

export async function getAllPacks(): Promise<
  { id: string; name: string; description: string; icon: string; category: string; card_count: number }[]
> {
  if (isWeb) return Array.from(memPacks.values()).sort((a, b) => a.name.localeCompare(b.name));
  const database = await getDatabase();
  return database.getAllAsync('SELECT * FROM packs ORDER BY name');
}

export async function getCardsForPack(
  packId: string
): Promise<{ id: string; pack_id: string; front: string; back: string; tags: string }[]> {
  if (isWeb) return Array.from(memCards.values()).filter(c => c.pack_id === packId);
  const database = await getDatabase();
  return database.getAllAsync('SELECT * FROM cards WHERE pack_id = ?', [packId]);
}

// --- Card Progress Operations ---

export async function getCardProgress(cardId: string): Promise<CardProgress | null> {
  if (isWeb) return memProgress.get(cardId) ?? null;
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    card_id: string;
    pack_id: string;
    ease_factor: number;
    interval: number;
    repetitions: number;
    next_review_date: string;
    last_review_date: string | null;
  }>('SELECT * FROM card_progress WHERE card_id = ?', [cardId]);

  if (!row) return null;

  return {
    cardId: row.card_id,
    packId: row.pack_id,
    easeFactor: row.ease_factor,
    interval: row.interval,
    repetitions: row.repetitions,
    nextReviewDate: row.next_review_date,
    lastReviewDate: row.last_review_date,
  };
}

export async function upsertCardProgress(progress: CardProgress): Promise<void> {
  if (isWeb) { memProgress.set(progress.cardId, progress); }
  else {
    const database = await getDatabase();
    await database.runAsync(
      `INSERT OR REPLACE INTO card_progress
       (card_id, pack_id, ease_factor, interval, repetitions, next_review_date, last_review_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        progress.cardId,
        progress.packId,
        progress.easeFactor,
        progress.interval,
        progress.repetitions,
        progress.nextReviewDate,
        progress.lastReviewDate,
      ]
    );
  }
  // Background cloud sync
  if (_currentUserId) pushCardProgress(_currentUserId, progress);
}

export async function getDueCards(
  packId: string,
  today: string
): Promise<{ id: string; pack_id: string; front: string; back: string; tags: string }[]> {
  if (isWeb) {
    return Array.from(memCards.values()).filter(c => {
      if (c.pack_id !== packId) return false;
      const p = memProgress.get(c.id);
      return p && p.nextReviewDate <= today;
    });
  }
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT c.* FROM cards c
     INNER JOIN card_progress cp ON c.id = cp.card_id
     WHERE c.pack_id = ? AND cp.next_review_date <= ?
     ORDER BY cp.next_review_date ASC`,
    [packId, today]
  );
}

export async function getNewCards(
  packId: string,
  limit: number
): Promise<{ id: string; pack_id: string; front: string; back: string; tags: string }[]> {
  if (isWeb) {
    return Array.from(memCards.values())
      .filter(c => c.pack_id === packId && !memProgress.has(c.id))
      .slice(0, limit);
  }
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT c.* FROM cards c
     LEFT JOIN card_progress cp ON c.id = cp.card_id
     WHERE c.pack_id = ? AND cp.card_id IS NULL
     LIMIT ?`,
    [packId, limit]
  );
}

export async function getPackProgress(
  packId: string
): Promise<{ totalCards: number; learnedCards: number; dueCards: number }> {
  if (isWeb) {
    const today = new Date().toISOString().split('T')[0];
    const cards = Array.from(memCards.values()).filter(c => c.pack_id === packId);
    const learned = cards.filter(c => memProgress.has(c.id));
    const due = learned.filter(c => {
      const p = memProgress.get(c.id);
      return p && p.nextReviewDate <= today;
    });
    return { totalCards: cards.length, learnedCards: learned.length, dueCards: due.length };
  }
  const database = await getDatabase();
  const today = new Date().toISOString().split('T')[0];

  const total = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM cards WHERE pack_id = ?',
    [packId]
  );

  const learned = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM card_progress WHERE pack_id = ?',
    [packId]
  );

  const due = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM card_progress
     WHERE pack_id = ? AND next_review_date <= ?`,
    [packId, today]
  );

  return {
    totalCards: total?.count ?? 0,
    learnedCards: learned?.count ?? 0,
    dueCards: due?.count ?? 0,
  };
}

// --- Daily Stats Operations ---

export async function recordReview(correct: boolean, isNew: boolean): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  if (isWeb) {
    const existing = memStats.get(today) ?? { date: today, cardsReviewed: 0, cardsCorrect: 0, newCardsSeen: 0 };
    existing.cardsReviewed++;
    if (correct) existing.cardsCorrect++;
    if (isNew) existing.newCardsSeen++;
    memStats.set(today, existing);
  } else {
    const database = await getDatabase();
    await database.runAsync(
      `INSERT INTO daily_stats (date, cards_reviewed, cards_correct, new_cards_seen)
       VALUES (?, 1, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         cards_reviewed = cards_reviewed + 1,
         cards_correct = cards_correct + ?,
         new_cards_seen = new_cards_seen + ?`,
      [today, correct ? 1 : 0, isNew ? 1 : 0, correct ? 1 : 0, isNew ? 1 : 0]
    );
  }
  // Background cloud sync
  if (_currentUserId) {
    const stats = isWeb
      ? memStats.get(today)!
      : await getDailyStats(today);
    if (stats) pushDailyStats(_currentUserId, today, stats);
  }
}

export async function getDailyStats(date: string): Promise<DailyStats | null> {
  if (isWeb) return memStats.get(date) ?? null;
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    date: string;
    cards_reviewed: number;
    cards_correct: number;
    new_cards_seen: number;
  }>('SELECT * FROM daily_stats WHERE date = ?', [date]);

  if (!row) return null;

  return {
    date: row.date,
    cardsReviewed: row.cards_reviewed,
    cardsCorrect: row.cards_correct,
    newCardsSeen: row.new_cards_seen,
  };
}

export async function getStreak(): Promise<number> {
  if (isWeb) {
    const dates = Array.from(memStats.values())
      .filter(s => s.cardsReviewed > 0)
      .map(s => s.date)
      .sort()
      .reverse();
    if (dates.length === 0) return 0;
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (dates[i] === expected.toISOString().split('T')[0]) streak++;
      else break;
    }
    return streak;
  }
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ date: string }>(
    'SELECT date FROM daily_stats WHERE cards_reviewed > 0 ORDER BY date DESC'
  );

  if (rows.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < rows.length; i++) {
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);
    const expected = expectedDate.toISOString().split('T')[0];

    if (rows[i].date === expected) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export async function getTotalDueCards(): Promise<number> {
  if (isWeb) {
    const today = new Date().toISOString().split('T')[0];
    return Array.from(memProgress.values()).filter(p => p.nextReviewDate <= today).length;
  }
  const database = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM card_progress WHERE next_review_date <= ?',
    [today]
  );
  return result?.count ?? 0;
}

export async function hasAnyReviewHistory(): Promise<boolean> {
  if (isWeb) return memProgress.size > 0;
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM card_progress LIMIT 1'
  );
  return (result?.count ?? 0) > 0;
}

export async function getDueCardCount(today: string): Promise<number> {
  if (isWeb) {
    let count = 0;
    for (const [, prog] of memProgress) {
      if (prog.nextReviewDate <= today) count++;
    }
    return count;
  }
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM card_progress WHERE next_review_date <= ?',
    [today]
  );
  return result?.count ?? 0;
}

export async function getTotalNewCards(): Promise<number> {
  if (isWeb) {
    return Array.from(memCards.values()).filter(c => !memProgress.has(c.id)).length;
  }
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM cards c
     LEFT JOIN card_progress cp ON c.id = cp.card_id
     WHERE cp.card_id IS NULL`
  );
  return result?.count ?? 0;
}

// --- Cloud Sync Hydration ---
import { pullAllProgress } from '@/lib/sync';

export async function hydrateFromCloud(userId: string): Promise<void> {
  setCurrentUserId(userId);
  const cloudProgress = await pullAllProgress(userId);
  if (cloudProgress.length === 0) return;

  for (const cp of cloudProgress) {
    const local = await getCardProgress(cp.card_id);
    // Cloud wins if local doesn't exist or cloud has a more recent review
    if (!local || cp.last_review_date > (local.lastReviewDate ?? '')) {
      // Temporarily disable sync to avoid pushing what we just pulled
      const savedId = _currentUserId;
      _currentUserId = null;
      await upsertCardProgress({
        cardId: cp.card_id,
        packId: cp.pack_id,
        easeFactor: cp.ease_factor,
        interval: cp.interval,
        repetitions: cp.repetitions,
        nextReviewDate: cp.next_review_date,
        lastReviewDate: cp.last_review_date,
      });
      _currentUserId = savedId;
    }
  }
}

// --- Quiz Results ---

const memQuizResults: { packName: string; score: number; total: number; date: string }[] = [];

export async function saveQuizResult(packName: string, score: number, total: number): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  if (isWeb) {
    memQuizResults.push({ packName, score, total, date });
  } else {
    const database = await getDatabase();
    await database.runAsync(
      'INSERT INTO quiz_results (pack_name, score, total, date) VALUES (?, ?, ?, ?)',
      [packName, score, total, date]
    );
  }
  // Background cloud sync
  if (_currentUserId) pushQuizResult(_currentUserId, packName, score, total, date);
}

export interface QuizResultRow {
  pack_name: string;
  score: number;
  total: number;
  date: string;
}

export async function getQuizResults(limit = 20): Promise<QuizResultRow[]> {
  if (isWeb) {
    return memQuizResults
      .slice(-limit)
      .reverse()
      .map(r => ({ pack_name: r.packName, score: r.score, total: r.total, date: r.date }));
  }
  const database = await getDatabase();
  return await database.getAllAsync<QuizResultRow>(
    'SELECT pack_name, score, total, date FROM quiz_results ORDER BY id DESC LIMIT ?',
    [limit]
  );
}

export async function getQuizStats(): Promise<{
  totalQuizzes: number;
  avgAccuracy: number;
  bestCategory: string | null;
  worstCategory: string | null;
}> {
  if (isWeb) {
    if (memQuizResults.length === 0) return { totalQuizzes: 0, avgAccuracy: 0, bestCategory: null, worstCategory: null };
    const totalQuizzes = memQuizResults.length;
    const avgAccuracy = memQuizResults.reduce((s, r) => s + r.score / r.total, 0) / totalQuizzes;
    const byPack: Record<string, { total: number; correct: number }> = {};
    for (const r of memQuizResults) {
      if (!byPack[r.packName]) byPack[r.packName] = { total: 0, correct: 0 };
      byPack[r.packName].total += r.total;
      byPack[r.packName].correct += r.score;
    }
    let best: string | null = null, worst: string | null = null;
    let bestAcc = -1, worstAcc = 2;
    for (const [name, d] of Object.entries(byPack)) {
      const acc = d.correct / d.total;
      if (acc > bestAcc) { bestAcc = acc; best = name; }
      if (acc < worstAcc) { worstAcc = acc; worst = name; }
    }
    return { totalQuizzes, avgAccuracy, bestCategory: best, worstCategory: worst };
  }
  const database = await getDatabase();
  const countRow = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM quiz_results'
  );
  const totalQuizzes = countRow?.count ?? 0;
  if (totalQuizzes === 0) return { totalQuizzes: 0, avgAccuracy: 0, bestCategory: null, worstCategory: null };
  const avgRow = await database.getFirstAsync<{ avg_acc: number }>(
    'SELECT AVG(CAST(score AS REAL) / total) as avg_acc FROM quiz_results'
  );
  const avgAccuracy = avgRow?.avg_acc ?? 0;
  const bestRow = await database.getFirstAsync<{ pack_name: string }>(
    'SELECT pack_name FROM quiz_results GROUP BY pack_name HAVING COUNT(*) >= 1 ORDER BY AVG(CAST(score AS REAL) / total) DESC LIMIT 1'
  );
  const worstRow = await database.getFirstAsync<{ pack_name: string }>(
    'SELECT pack_name FROM quiz_results GROUP BY pack_name HAVING COUNT(*) >= 1 ORDER BY AVG(CAST(score AS REAL) / total) ASC LIMIT 1'
  );
  return {
    totalQuizzes,
    avgAccuracy,
    bestCategory: bestRow?.pack_name ?? null,
    worstCategory: worstRow?.pack_name ?? null,
  };
}
