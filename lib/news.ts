const HN_TOP_STORIES = 'https://hacker-news.firebaseio.com/v0/topstories.json';
const HN_ITEM = 'https://hacker-news.firebaseio.com/v0/item';

export interface NewsStory {
  id: number;
  title: string;
  url: string;
  source: string; // domain name
  score: number;
  time: number; // unix timestamp
  commentCount: number;
}

interface NewsCache {
  stories: NewsStory[];
  fetchedAt: number;
}

const CACHE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
let cache: NewsCache | null = null;

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return 'news.ycombinator.com';
  }
}

async function fetchStory(id: number): Promise<NewsStory | null> {
  try {
    const res = await fetch(`${HN_ITEM}/${id}.json`);
    const item = await res.json();
    if (!item || item.type !== 'story' || item.dead || item.deleted) return null;
    return {
      id: item.id,
      title: item.title,
      url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
      source: item.url ? extractDomain(item.url) : 'news.ycombinator.com',
      score: item.score ?? 0,
      time: item.time ?? 0,
      commentCount: item.descendants ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch today's top tech news stories from Hacker News.
 * Results are cached for 2 hours to minimize network calls.
 */
export async function fetchTopTechNews(count: number = 5): Promise<NewsStory[]> {
  // Return cache if fresh
  if (cache && Date.now() - cache.fetchedAt < CACHE_DURATION_MS) {
    return cache.stories.slice(0, count);
  }

  try {
    const res = await fetch(HN_TOP_STORIES);
    const ids: number[] = await res.json();

    // Fetch top 15 stories in parallel, then take the best `count`
    const batchSize = Math.min(15, ids.length);
    const promises = ids.slice(0, batchSize).map(fetchStory);
    const results = await Promise.all(promises);

    const stories = results
      .filter((s): s is NewsStory => s !== null)
      .slice(0, count);

    cache = { stories, fetchedAt: Date.now() };
    return stories;
  } catch (err) {
    console.error('Failed to fetch tech news:', err);
    // Return stale cache if available
    if (cache) return cache.stories.slice(0, count);
    return [];
  }
}

/** Format a unix timestamp as relative time (e.g. "3h ago") */
export function timeAgo(unixSeconds: number): string {
  const seconds = Math.floor(Date.now() / 1000) - unixSeconds;
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
