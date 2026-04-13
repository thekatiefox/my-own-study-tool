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
  summary: string; // top comment excerpt as context
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

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchTopComment(kids: number[] | undefined): Promise<string> {
  if (!kids || kids.length === 0) return '';
  try {
    const res = await fetch(`${HN_ITEM}/${kids[0]}.json`);
    const comment = await res.json();
    if (!comment || comment.dead || comment.deleted || !comment.text) return '';
    const clean = stripHtml(comment.text);
    return clean.length > 180 ? clean.slice(0, 177) + '...' : clean;
  } catch {
    return '';
  }
}

async function fetchStory(id: number): Promise<NewsStory | null> {
  try {
    const res = await fetch(`${HN_ITEM}/${id}.json`);
    const item = await res.json();
    if (!item || item.type !== 'story' || item.dead || item.deleted) return null;

    // Use the story's own text (for Ask HN / Show HN), or fetch top comment
    let summary = '';
    if (item.text) {
      const clean = stripHtml(item.text);
      summary = clean.length > 180 ? clean.slice(0, 177) + '...' : clean;
    }

    return {
      id: item.id,
      title: item.title,
      url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
      source: item.url ? extractDomain(item.url) : 'news.ycombinator.com',
      score: item.score ?? 0,
      time: item.time ?? 0,
      commentCount: item.descendants ?? 0,
      summary,
      _kids: item.kids,
    } as NewsStory & { _kids?: number[] };
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
      .filter((s): s is NewsStory & { _kids?: number[] } => s !== null)
      .slice(0, count);

    // Fetch top comments in parallel for stories without a summary
    await Promise.all(
      stories.map(async (story) => {
        if (!story.summary && (story as any)._kids) {
          story.summary = await fetchTopComment((story as any)._kids);
        }
        delete (story as any)._kids;
      })
    );

    cache = { stories, fetchedAt: Date.now() };
    return stories;
  } catch (err) {
    console.error('Failed to fetch tech news:', err);
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
