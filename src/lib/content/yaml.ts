import YAML from 'yaml';

// Floats stay strings exactly as written ("1.50" stays "1.50"); schemas coerce
// to numbers only where a number is expected.
const options = {
  customTags: (tags: YAML.Tags) => tags.filter((t) => typeof t === 'string' || t.tag !== 'tag:yaml.org,2002:float'),
};

export function parseYaml(source: string): unknown {
  return YAML.parse(source, options);
}

/** Splits a Markdown file into YAML front matter and body. */
export function parseFrontmatter(source: string): { data: unknown; body: string } {
  const m = /^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/.exec(source);
  if (!m) throw new Error('missing front matter: the file must start with a --- block');
  return { data: parseYaml(m[1]) ?? {}, body: m[2] };
}
