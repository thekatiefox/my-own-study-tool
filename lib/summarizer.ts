import { GEMINI_API_KEY } from '@/secrets';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const isConfigured = GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE';

export interface ArticleInput {
  title: string;
  url: string;
  source: string;
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchArticleText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StudyToolBot/1.0)' },
    });
    if (!res.ok) return '';
    const html = await res.text();
    const text = stripHtmlToText(html);
    // Take a meaningful chunk — enough for a good summary
    return text.slice(0, 3000);
  } catch {
    return '';
  }
}

/**
 * Fetch article content and generate ADHD-friendly bullet-point summaries.
 * Returns a map of title → summary. Uses a single LLM call for all stories.
 */
export async function summarizeArticles(
  articles: ArticleInput[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!isConfigured || articles.length === 0) return result;

  // Fetch article text in parallel
  const texts = await Promise.all(articles.map(a => fetchArticleText(a.url)));

  const storiesBlock = articles.map((a, i) => {
    const content = texts[i] || '(could not fetch article content)';
    return `--- STORY ${i + 1} ---
Title: ${a.title}
Source: ${a.source}
Content: ${content}`;
  }).join('\n\n');

  const prompt = `You're explaining today's top tech news to someone who's new to the industry and has ADHD. Keep it super scannable and easy to digest.

For each story below, read the actual article content and write:
• What happened (1 short sentence, simple words)
• Why it matters (1 short sentence, why should I care?)
No jargon — if you must use a technical term, explain it in parentheses. Max 40 words total per story.

${storiesBlock}

Respond with ONLY numbered entries. Use bullet points (•) within each:
1. • What happened...
• Why it matters...
2. • What happened...
• Why it matters...`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 600,
        },
      }),
    });

    if (!res.ok) {
      console.warn('Gemini API error:', res.status);
      return result;
    }

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Parse: split by numbered entries, collect bullet lines for each
    const blocks = text.split(/(?=^\d+\.)/m).filter(b => b.trim());
    blocks.forEach((block) => {
      const headerMatch = block.match(/^(\d+)\./);
      if (!headerMatch) return;
      const idx = parseInt(headerMatch[1], 10) - 1;
      if (idx < 0 || idx >= articles.length) return;

      const bullets = block
        .split('\n')
        .filter(l => l.trim().startsWith('•'))
        .map(l => l.trim())
        .join('\n');

      if (bullets) {
        result.set(articles[idx].title, bullets);
      }
    });
  } catch (err) {
    console.warn('Failed to summarize articles:', err);
  }

  return result;
}

