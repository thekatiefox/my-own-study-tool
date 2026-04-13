import { Platform } from 'react-native';
import { GEMINI_API_KEY } from '@/secrets';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const isConfigured = GEMINI_API_KEY && (GEMINI_API_KEY as string) !== 'YOUR_GEMINI_API_KEY_HERE';

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

  // On native, fetch article text for richer summaries. On web, CORS blocks this.
  const texts = Platform.OS === 'web'
    ? articles.map(() => '')
    : await Promise.all(articles.map(a => fetchArticleText(a.url)));

  const hasContent = texts.some(t => t.length > 0);

  const storiesBlock = articles.map((a, i) => {
    const content = texts[i];
    return content
      ? `--- STORY ${i + 1} ---\nTitle: ${a.title}\nSource: ${a.source}\nContent: ${content}`
      : `--- STORY ${i + 1} ---\nTitle: ${a.title}\nSource: ${a.source}`;
  }).join('\n\n');

  const contentInstruction = hasContent
    ? 'Read the actual article content and write:'
    : 'Based on each headline, write your best explanation:';

  const prompt = `You're explaining today's top tech news to someone who's new to the industry and has ADHD. Keep it super scannable and easy to digest.

For each story below, ${contentInstruction}
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

/**
 * Generate an ELI5 (Explain Like I'm 5) breakdown for a quiz question.
 * Returns a beginner-friendly explanation of the concept.
 */
export async function explainSimpler(
  question: string,
  options: string[],
  correctIndex: number,
  existingExplanation?: string
): Promise<string> {
  if (!isConfigured) return 'API key not configured. Unable to generate explanation.';

  const prompt = `You're a patient, encouraging mentor explaining a coding concept to someone who just started learning to code. Use an ELI5 (Explain Like I'm 5) style with a real-world analogy.

Quiz question: "${question}"

Options:
${options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}${i === correctIndex ? ' ✅ (correct)' : ''}`).join('\n')}

${existingExplanation ? `Original explanation: ${existingExplanation}` : ''}

Write a SHORT (80 words max), beginner-friendly explanation that:
1. Uses a real-world analogy to explain the core concept
2. Explains WHY the correct answer makes sense (not just that it IS correct)
3. Uses simple language — no jargon, no acronyms without definitions
4. Feels warm and encouraging, not textbook-y

Start directly with the analogy — no "Great question!" preamble.`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
        },
      }),
    });

    if (!res.ok) {
      console.warn('Gemini ELI5 error:', res.status);
      return 'Could not generate explanation right now. Try again later!';
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? 'No explanation generated.';
  } catch (err) {
    console.warn('ELI5 generation failed:', err);
    return 'Could not generate explanation right now. Try again later!';
  }
}

