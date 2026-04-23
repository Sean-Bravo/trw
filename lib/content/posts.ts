import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { Post, PostCategory } from './types';

const BLOG_DIR = path.join(process.cwd(), 'content/blog');
const WORDS_PER_MINUTE = 200;

function normalizeDate(raw: unknown): string {
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw === 'string') return raw;
  throw new Error(`Invalid date frontmatter: ${String(raw)}`);
}

function computeReadingTime(content: string): number {
  const words = content.split(/\s+/g).filter(Boolean).length;
  return Math.ceil(words / WORDS_PER_MINUTE);
}

function loadPosts(): Post[] {
  const filenames = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.mdx'));

  const posts = filenames.map<Post>((filename) => {
    const filePath = path.join(BLOG_DIR, filename);
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(raw);

    const missing: string[] = [];
    if (!data['title']) missing.push('title');
    if (!data['description']) missing.push('description');
    if (!data['date']) missing.push('date');
    if (missing.length) {
      throw new Error(
        `Missing required frontmatter in content/blog/${filename}: ${missing.join(', ')}`,
      );
    }

    const slug = filename.replace(/\.mdx$/, '');

    return {
      title: String(data['title']),
      description: String(data['description']),
      date: normalizeDate(data['date']),
      author: typeof data['author'] === 'string' ? data['author'] : 'TaxFormatter Team',
      category: (typeof data['category'] === 'string' ? data['category'] : 'guides') as PostCategory,
      tags: Array.isArray(data['tags']) ? data['tags'].map(String) : [],
      image: typeof data['image'] === 'string' ? data['image'] : undefined,
      published: typeof data['published'] === 'boolean' ? data['published'] : true,
      featured: typeof data['featured'] === 'boolean' ? data['featured'] : false,
      url: `/blog/${slug}`,
      slug,
      readingTime: computeReadingTime(content),
      body: { raw: content },
    };
  });

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const allPosts: Post[] = loadPosts();
