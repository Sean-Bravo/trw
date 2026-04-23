export type PostCategory =
  | 'crypto-tax'
  | 'guides'
  | 'updates'
  | 'tax-tips'
  | 'crypto-news'
  | 'bookkeeping';

export interface Post {
  title: string;
  description: string;
  date: string;
  author: string;
  category: PostCategory;
  tags: string[];
  image?: string;
  published: boolean;
  featured: boolean;
  // computed
  url: string;
  slug: string;
  readingTime: number;
  // body
  body: { raw: string };
}

export interface Doc {
  title: string;
  description?: string;
  published: boolean;
  order: number;
  // computed
  url: string;
  slug: string;
  section: string;
  // body
  body: { raw: string };
}
