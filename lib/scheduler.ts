import {
  getDueCards,
  getNewCards,
  getCardProgress,
  getAllPacks,
} from './database';
import { CardContent, ReviewCard } from '@/types';

const NEW_CARDS_PER_SESSION = 5;

/** Shuffle an array in place (Fisher-Yates). */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build a review queue for a single pack: due cards first, then new cards.
 */
export async function buildReviewQueue(packId: string): Promise<ReviewCard[]> {
  const today = new Date().toISOString().split('T')[0];
  const dueRows = await getDueCards(packId, today);
  const newRows = await getNewCards(packId, NEW_CARDS_PER_SESSION);

  const queue: ReviewCard[] = [];

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
 * Build a mixed review queue from multiple packs, shuffled together.
 * @param packIds - which packs to include (empty/undefined = all packs)
 */
export async function buildMixedReviewQueue(
  packIds?: string[]
): Promise<ReviewCard[]> {
  const allPacks = await getAllPacks();
  const selectedIds = packIds && packIds.length > 0
    ? packIds
    : allPacks.map(p => p.id);

  const queue: ReviewCard[] = [];
  const today = new Date().toISOString().split('T')[0];
  const newPerPack = Math.max(1, Math.floor(NEW_CARDS_PER_SESSION / selectedIds.length));

  for (const pid of selectedIds) {
    const dueRows = await getDueCards(pid, today);
    for (const row of dueRows) {
      const progress = await getCardProgress(row.id);
      queue.push({
        content: { id: row.id, front: row.front, back: row.back, tags: JSON.parse(row.tags) },
        progress,
        isFlipped: false,
        packId: pid,
      });
    }

    const newRows = await getNewCards(pid, newPerPack);
    for (const row of newRows) {
      queue.push({
        content: { id: row.id, front: row.front, back: row.back, tags: JSON.parse(row.tags) },
        progress: null,
        isFlipped: false,
        packId: pid,
      });
    }
  }

  return shuffle(queue);
}

export { NEW_CARDS_PER_SESSION };
