import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { Doc } from './types';

const DOCS_DIR = path.join(process.cwd(), 'content/docs');

interface DocFile {
  relPath: string;
  fullPath: string;
}

function walkDocs(dir: string, base = ''): DocFile[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: DocFile[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...walkDocs(fullPath, rel));
    } else if (entry.isFile() && /\.(md|mdx)$/.test(entry.name)) {
      results.push({ relPath: rel, fullPath });
    }
  }
  return results;
}

function loadDocs(): Doc[] {
  const files = walkDocs(DOCS_DIR);

  return files.map<Doc>(({ relPath, fullPath }) => {
    const raw = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(raw);

    if (!data['title']) {
      throw new Error(`Missing required frontmatter 'title' in content/docs/${relPath}`);
    }

    const cleanRelPath = relPath.replace(/\.(md|mdx)$/, '');
    const flatPath = `docs/${cleanRelPath}`;
    const segments = flatPath.split('/');
    const slug = segments.slice(1).join('/');
    const section = segments[1] ?? '';

    return {
      title: String(data['title']),
      description: typeof data['description'] === 'string' ? data['description'] : undefined,
      published: typeof data['published'] === 'boolean' ? data['published'] : true,
      order: typeof data['order'] === 'number' ? data['order'] : 0,
      url: `/${flatPath}`,
      slug,
      section,
      body: { raw: content },
    };
  });
}

export const allDocs: Doc[] = loadDocs();
