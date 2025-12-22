import React from 'react';
import { Container } from '../layout/Container';
import { Button } from '../ui/Button';

export function Hero() {
  return (
    <section className="bg-white py-24 sm:py-32 relative overflow-hidden">
      <Container>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-2 bg-[#f3f4f6] text-[#4b5563] rounded-full text-xs font-normal uppercase tracking-wider">
            New: CSV Repair Tool
          </div>

          <h1 className="font-poppins text-4xl sm:text-5xl md:text-6xl font-bold text-[#1a365d] leading-tight tracking-tight mb-6">
            Universal translation engine for crypto financial data
          </h1>

          <p className="text-lg text-[#4b5563] max-w-2xl mx-auto mb-10 leading-relaxed">
            Fix your crypto CSVs for tax software
          </p>


          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
            <Button variant="primary" href="#start" showArrow>
              Audit Your File
            </Button>
            <Button variant="secondary" href="#pricing" showArrow>
              View Pricing
            </Button>
          </div>

          <div className="mt-20">
            <div className="bg-[#f9fafb] rounded-xl p-8 border border-[#e5e7eb] shadow-[0_4px_12px_rgba(26,54,93,0.15)]">
              <div className="aspect-video bg-gradient-to-br from-[#1a365d] to-[#059669] rounded-lg flex items-center justify-center">
                <p className="text-white font-poppins text-xl">Dashboard Preview</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

