import React from 'react';
import { Container } from '../layout/Container';
import { X, Check } from 'lucide-react';

const comparisons = [
  {
    feature: 'Speed',
    manual: '8+ hours',
    competitor: '2-4 hours',
    us: '30 seconds',
  },
  {
    feature: 'Cost',
    manual: 'Your time',
    competitor: '$199-499/year',
    us: '$49/year',
  },
  {
    feature: 'Accuracy',
    manual: 'Error-prone',
    competitor: '95% accurate',
    us: '99.9% accurate',
  },
  {
    feature: 'Platform Lock-in',
    manual: 'None',
    competitor: 'Vendor locked',
    us: 'Export anywhere',
  },
  {
    feature: 'Audit Defense',
    manual: false,
    competitor: 'Extra $200/year',
    us: true,
  },
  {
    feature: 'Data Retention',
    manual: 'Forever',
    competitor: 'Forever',
    us: '24 hours',
  },
];

export function CostOfClarity() {
  return (
    <section className="bg-[#f9fafb] py-24 sm:py-32">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-4 leading-tight">
            Why TaxReadyWallet?
          </h2>
          <p className="text-lg text-[#4b5563] max-w-2xl mx-auto">
            Stop overpaying for bloated tax software. Get exactly what you need.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(26,54,93,0.12)] overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 p-6 bg-gradient-to-r from-[#f9fafb] to-white border-b border-[#e5e7eb]">
              <div className="font-poppins text-sm font-semibold text-[#6b7280] uppercase tracking-wider">
                Feature
              </div>
              <div className="text-center font-poppins text-sm font-semibold text-[#6b7280] uppercase tracking-wider">
                Manual Editing
              </div>
              <div className="text-center font-poppins text-sm font-semibold text-[#6b7280] uppercase tracking-wider">
                Competitors
              </div>
              <div className="text-center font-poppins text-sm font-semibold text-[#3b82f6] uppercase tracking-wider bg-[#3b82f6]/5 rounded-lg px-2 py-1">
                TaxReadyWallet
              </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-[#e5e7eb]">
              {comparisons.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-4 gap-4 p-6 hover:bg-[#f9fafb]/50 transition-colors"
                >
                  {/* Feature Name */}
                  <div className="font-poppins text-base font-semibold text-[#1a365d]">
                    {row.feature}
                  </div>

                  {/* Manual */}
                  <div className="text-center text-sm text-[#6b7280]">
                    {typeof row.manual === 'boolean' ? (
                      row.manual ? (
                        <Check className="h-5 w-5 text-[#059669] inline-block" />
                      ) : (
                        <X className="h-5 w-5 text-[#dc2626] inline-block" />
                      )
                    ) : (
                      row.manual
                    )}
                  </div>

                  {/* Competitor */}
                  <div className="text-center text-sm text-[#6b7280]">
                    {typeof row.competitor === 'boolean' ? (
                      row.competitor ? (
                        <Check className="h-5 w-5 text-[#059669] inline-block" />
                      ) : (
                        <X className="h-5 w-5 text-[#dc2626] inline-block" />
                      )
                    ) : (
                      row.competitor
                    )}
                  </div>

                  {/* Us (Highlighted) */}
                  <div className="text-center bg-[#3b82f6]/5 rounded-lg px-2 py-1">
                    {typeof row.us === 'boolean' ? (
                      row.us ? (
                        <Check className="h-6 w-6 text-[#059669] inline-block font-bold" strokeWidth={3} />
                      ) : (
                        <X className="h-6 w-6 text-[#dc2626] inline-block" />
                      )
                    ) : (
                      <span className="font-poppins text-sm font-bold text-[#1a365d]">
                        {row.us}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-8">
            <p className="text-sm text-[#6b7280]">
              No annual commitments. No vendor lock-in. No bloated features you'll never use.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

