import { MetadataRoute } from 'next';
import { allDocs } from '.contentlayer/generated';

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

  return [...routes, ...docPages];
}
