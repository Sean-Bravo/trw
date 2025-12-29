import { MetadataRoute } from 'next';
import { allDocs, allPosts } from '.contentlayer/generated';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://taxformatter.com';

  // Main pages
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/success`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Add all documentation pages
  const docPages = allDocs.map((doc) => ({
    url: `${baseUrl}${doc.url}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Add all blog posts
  const blogPosts = allPosts
    .filter((post) => post.published)
    .map((post) => ({
      url: `${baseUrl}${post.url}`,
      lastModified: new Date(post.date),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }));

  return [...routes, ...docPages, ...blogPosts];
}
