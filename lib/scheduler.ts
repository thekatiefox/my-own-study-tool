import {
  getDueCards,
  getNewCards,
  getCardProgress,
} from './database';
import { CardContent, ReviewCard } from '@/types';

const NEW_CARDS_PER_SESSION = 5;

/**
 * Build a review queue for a pack: due cards first, then new cards up to the daily limit.
 */
export async function buildReviewQueue(packId: string): Promise<ReviewCard[]> {
  const today = new Date().toISOString().split('T')[0];

  // Get cards due for review
  const dueRows = await getDueCards(packId, today);

  // Get new cards (never seen before)
  const newRows = await getNewCards(packId, NEW_CARDS_PER_SESSION);

  const queue: ReviewCard[] = [];

  // Add due cards
  for (const row of dueRows) {
    const progress = await getCardProgress(row.id);
    const content: CardContent = {
      id: row.id,
      front: row.front,
      back: row.back,
      tags: JSON.parse(row.tags),
    };
    queue.push({ content, progress, isFlipped: false });
  }

  // Add new cards
  for (const row of newRows) {
    const content: CardContent = {
      id: row.id,
      front: row.front,
      back: row.back,
      tags: JSON.parse(row.tags),
    };
    queue.push({ content, progress: null, isFlipped: false });
  }

  return queue;
}

/**
 * Build a review queue across all packs (for the "Review All" home screen action).
 */
export async function buildGlobalReviewQueue(): Promise<{
  cards: ReviewCard[];
  packId: string;
}> {
  // For global review, we use a virtual "all" pack ID
  // The home screen will handle routing
  const today = new Date().toISOString().split('T')[0];
  const { getDueCards: getDue, getNewCards: getNew, getCardProgress: getProgress } = await import('./database');

  // We import getAllPacks to iterate
  const { getAllPacks } = await import('./database');
  const packs = await getAllPacks();

  const queue: ReviewCard[] = [];

  for (const pack of packs) {
    const dueRows = await getDue(pack.id, today);
    for (const row of dueRows) {
      const progress = await getProgress(row.id);
      queue.push({
        content: {
          id: row.id,
          front: row.front,
          back: row.back,
          tags: JSON.parse(row.tags),
        },
        progress,
        isFlipped: false,
      });
    }

    const newRows = await getNew(pack.id, NEW_CARDS_PER_SESSION);
    for (const row of newRows) {
      queue.push({
        content: {
          id: row.id,
          front: row.front,
          back: row.back,
          tags: JSON.parse(row.tags),
        },
        progress: null,
        isFlipped: false,
      });
    }
  }

  return { cards: queue, packId: 'all' };
}

export { NEW_CARDS_PER_SESSION };
