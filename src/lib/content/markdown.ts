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
        const spacedWord = /\s/.test(plain) && /(^|\s)[a-zA-Z]{3,}([\s.,;:]|$)/.test(plain);
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

/** Renders a short fragment (a choice, a label) without the wrapping <p>. */
export function renderInline(markdown: string): Rendered {
  const out = renderMarkdown(markdown);
  const m = /^<p>([\s\S]*)<\/p>$/.exec(out.html);
  return { html: m && !m[1].includes('<p>') ? m[1] : out.html, problems: out.problems };
}
