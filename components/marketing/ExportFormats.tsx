import React from 'react';
import { Container } from '../layout/Container';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ArrowUpRight } from 'lucide-react';

const platforms = [
  {
    name: 'Koinly',
    description: 'Export directly to Koinly format with all transactions properly formatted.',
    color: 'bg-blue-500',
  },
  {
    name: 'TurboTax',
    description: 'Generate 8949 forms compatible with TurboTax import.',
    color: 'bg-red-500',
  },
  {
    name: 'CoinLedger',
    description: 'Perfect CSV format for CoinLedger tax reporting.',
    color: 'bg-yellow-500',
  },
  {
    name: 'ZenLedger',
    description: 'Export to ZenLedger with all cost basis calculations intact.',
    color: 'bg-green-500',
  },
];

export function ExportFormats() {
  return (
    <section className="bg-white py-24 sm:py-32">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-4 leading-tight">
            Export to Any Tax Platform
          </h2>
          <p className="text-lg text-[#4b5563] max-w-2xl mx-auto">
            Don't change your tax software. Just fix your data.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {platforms.map((platform, index) => (
            <Card key={index}>
              <div className="flex flex-col">
                <div className={`${platform.color} rounded-lg p-3 w-12 h-12 flex items-center justify-center mb-4`}>
                  <div className="w-6 h-6 bg-white rounded"></div>
                </div>
                <h3 className="font-poppins text-xl font-semibold text-[#1a365d] mb-2 leading-snug">
                  {platform.name}
                </h3>
                <p className="text-sm text-[#4b5563] mb-6 leading-relaxed">
                  {platform.description}
                </p>
                <div className="border-t border-[#e5e7eb] pt-6 flex justify-between items-center mt-auto">
                  <Badge variant="success" showIcon>
                    Verified
                  </Badge>
                  <ArrowUpRight className="h-5 w-5 text-[#1a365d]" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

