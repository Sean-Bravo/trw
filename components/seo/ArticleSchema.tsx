import { Article, WithContext } from 'schema-dts';

interface ArticleSchemaProps {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  image?: string;
  category: string;
  tags: string[];
}

export function ArticleSchema({
  title,
  description,
  url,
  datePublished,
  dateModified,
  author,
  image,
  category,
  tags,
}: ArticleSchemaProps) {
  const schema: WithContext<Article> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    url: `https://www.taxformatter.com${url}`,
    datePublished: datePublished,
    dateModified: dateModified || datePublished,
    author: {
      '@type': 'Organization',
      name: author,
      url: 'https://www.taxformatter.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'TaxFormatter',
      url: 'https://www.taxformatter.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.taxformatter.com/logo-icon.svg',
      },
    },
    ...(image && {
      image: {
        '@type': 'ImageObject',
        url: `https://www.taxformatter.com${image}`,
      },
    }),
    articleSection: category,
    keywords: tags.join(', '),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.taxformatter.com${url}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
