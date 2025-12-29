import { HowTo, WithContext } from 'schema-dts';

interface Step {
  name: string;
  text: string;
  url?: string;
}

interface HowToSchemaProps {
  name: string;
  description: string;
  steps: Step[];
  totalTime?: string; // ISO 8601 duration format, e.g., "PT10M" for 10 minutes
}

export function HowToSchema({ name, description, steps, totalTime }: HowToSchemaProps) {
  const schema: WithContext<HowTo> = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    ...(totalTime && { totalTime }),
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.url && { url: step.url }),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
