// Markdown -> HTML at build time, with GFM tables and KaTeX math.
// Math uses $...$ (inline) and $$...$$ (display). Dollar amounts must be
// escaped as \$ so they are not mistaken for math.
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import type { Root } from 'mdast';
import type { VFile } from 'vfile';

// Words inside inline math usually mean an unescaped currency sign, e.g.
// "costs $40 and $60" renders "40 and " as math.
function remarkFlagCurrency() {
  return (tree: Root, file: VFile) => {
    const visit = (node: { type: string; value?: string; children?: unknown[] }) => {
      if (node.type === 'inlineMath' && node.value?.endsWith('\\')) {
        file.message(`"\\$" inside math ends the math early — write dollar amounts outside the $...$`);
      } else if (node.type === 'inlineMath' && node.value) {
        const plain = node.value.replace(/\\(?:text|mathrm|operatorname|textbf|textit)\{[^}]*\}/g, '').replace(/\\[a-zA-Z]+/g, '');
        const edgeSpace = /^\s|\s$/.test(node.value);
        // Two lowercase words in a row ("and the") read as prose; single names like "Prt" are variables.
        const spacedWord = /(^|\s)[a-z]{2,}\s+[a-z]{2,}([\s.,;:]|$)/.test(plain);
        if (edgeSpace || spacedWord) {
          file.message(`inline math "$${node.value}$" contains ordinary words — escape dollar amounts as \\$`);
        }
      }
      node.children?.forEach((child) => visit(child as typeof node));
    };
    visit(tree);
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm, { singleTilde: false })
  .use(remarkMath)
  .use(remarkFlagCurrency)
  .use(remarkRehype)
  .use(rehypeKatex, { throwOnError: true, strict: false })
  .use(rehypeStringify);

export interface Rendered {
  html: string;
  problems: string[];
}

export function renderMarkdown(markdown: string): Rendered {
  const file = processor.processSync(markdown);
  return {
    html: String(file).trim(),
    problems: file.messages.map((m) => (m.cause instanceof Error ? `${m.reason}: ${m.cause.message}` : m.reason)),
  };
}

// ----------------------------------------------------- long-form documents

export interface Heading {
  depth: 2 | 3;
  text: string;
  id: string;
}

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const textOf = (n: HastNode): string => (n.type === 'text' ? (n.value ?? '') : (n.children ?? []).map(textOf).join(''));

/** Gives h2/h3 headings stable ids and records them for a table of contents. */
function rehypeHeadingIds() {
  return (tree: HastNode, file: VFile) => {
    const headings: Heading[] = [];
    const used = new Map<string, number>();
    const walk = (node: HastNode) => {
      if (node.type === 'element' && (node.tagName === 'h2' || node.tagName === 'h3')) {
        const text = textOf(node).trim();
        const base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
        const n = used.get(base) ?? 0;
        used.set(base, n + 1);
        const id = n ? `${base}-${n + 1}` : base;
        node.properties = { ...node.properties, id };
        headings.push({ depth: node.tagName === 'h2' ? 2 : 3, text, id });
      }
      node.children?.forEach(walk);
    };
    walk(tree);
    file.data.headings = headings;
  };
}

const documentProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm, { singleTilde: false })
  .use(remarkMath)
  .use(remarkFlagCurrency)
  .use(remarkRehype)
  .use(rehypeHeadingIds)
  .use(rehypeKatex, { throwOnError: true, strict: false })
  .use(rehypeStringify);

/** Renders a full document (a revision note) and lists its headings. */
export function renderDocument(markdown: string): Rendered & { headings: Heading[] } {
  const file = documentProcessor.processSync(markdown);
  return {
    html: String(file).trim(),
    problems: file.messages.map((m) => (m.cause instanceof Error ? `${m.reason}: ${m.cause.message}` : m.reason)),
    headings: (file.data.headings as Heading[] | undefined) ?? [],
  };
}

/** Renders a short fragment (a choice, a label) without the wrapping <p>. */
export function renderInline(markdown: string): Rendered {
  const out = renderMarkdown(markdown);
  const m = /^<p>([\s\S]*)<\/p>$/.exec(out.html);
  return { html: m && !m[1].includes('<p>') ? m[1] : out.html, problems: out.problems };
}
