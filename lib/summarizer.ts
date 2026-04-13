import { GEMINI_API_KEY } from '@/secrets';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const isConfigured = GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE';

/**
 * Summarize a batch of news headlines into plain-English 1-sentence descriptions.
 * Returns a map of title → summary. Uses a single API call for all stories.
 */
export async function summarizeHeadlines(
  headlines: { title: string; source: string }[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!isConfigured || headlines.length === 0) return result;

  const numbered = headlines.map((h, i) => `${i + 1}. "${h.title}" (${h.source})`).join('\n');

  const prompt = `You are a helpful tech news assistant. For each headline below, write a single plain-English sentence (max 25 words) explaining what the story is about in simple terms. A smart person who doesn't follow tech news should understand it.

Headlines:
${numbered}

Respond with ONLY numbered lines matching the input, like:
1. Summary here
2. Summary here`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 300,
        },
      }),
    });

    if (!res.ok) {
      console.warn('Gemini API error:', res.status);
      return result;
    }

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Parse numbered lines
    const lines = text.split('\n').filter((l: string) => /^\d+\.\s/.test(l.trim()));
    lines.forEach((line: string) => {
      const match = line.match(/^(\d+)\.\s*(.+)/);
      if (match) {
        const idx = parseInt(match[1], 10) - 1;
        if (idx >= 0 && idx < headlines.length) {
          result.set(headlines[idx].title, match[2].trim());
        }
      }
    });
  } catch (err) {
    console.warn('Failed to summarize headlines:', err);
  }

  return result;
}
