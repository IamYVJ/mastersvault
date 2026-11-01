// Splits a passage into paragraphs and sentences, for Reading Comprehension questions that are
// answered by selecting a sentence. The passage file stays ordinary Markdown: a blank line ends a
// paragraph, and a sentence ends at ".", "?" or "!" (with any closing quote or bracket) followed by a
// space and a capital letter, a digit or an opening quote. Abbreviations such as "Dr." and initials
// such as "J." don't end a sentence, and neither does anything inside $...$ maths.
//
// Passages used this way must be plain paragraphs: no headings, lists, quotes or tables.

export interface Sentence {
  /** Counted from 1. */
  paragraph: number;
  /** The sentence's Markdown, with line breaks and runs of spaces collapsed to single spaces. */
  text: string;
}

const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'jr', 'sr', 'vs', 'etc', 'e.g', 'i.e', 'cf', 'no', 'nos', 'fig', 'vol',
  'ca', 'c', 'approx', 'u.s', 'u.k', 'a.m', 'p.m', 'gen', 'col', 'lt', 'mt', 'ft', 'inc', 'co', 'corp', 'ltd',
]);

const BOUNDARY = /([.!?])(["'”’)\]*_]*)\s+(?=["'“‘(\[*_]*[A-Z0-9])/g;

export const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

export function paragraphsOf(body: string): string[] {
  return body
    .split(/\n[ \t]*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Why a passage can't be split into selectable sentences, or null if it can. */
export function unsplittable(body: string): string | null {
  for (const [i, p] of paragraphsOf(body).entries()) {
    if (/^(#|>|[-*+]\s|\d+[.)]\s|\|)/m.test(p)) return `paragraph ${i + 1} is not a plain paragraph (heading, list, quote or table)`;
  }
  return null;
}

export function splitSentences(body: string): Sentence[] {
  const out: Sentence[] = [];
  paragraphsOf(body).forEach((raw, i) => {
    const p = normalize(raw);
    let start = 0;
    for (const m of p.matchAll(BOUNDARY)) {
      const end = m.index + m[1].length + m[2].length;
      if (m[1] === '.') {
        const word = p.slice(start, m.index).split(' ').pop()!.replace(/^["'“‘(\[*_]+/, '');
        if (ABBREVIATIONS.has(word.toLowerCase()) || /^[A-Z]$/.test(word)) continue;
      }
      // Count unescaped dollar signs: an odd number means the boundary is inside maths.
      if ((p.slice(0, m.index).match(/(?<!\\)\$/g)?.length ?? 0) % 2) continue;
      out.push({ paragraph: i + 1, text: p.slice(start, end) });
      start = end + 1;
    }
    const rest = p.slice(start).trim();
    if (rest) out.push({ paragraph: i + 1, text: rest });
  });
  return out;
}
