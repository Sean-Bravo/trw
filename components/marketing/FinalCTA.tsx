import React from 'react';
import { Container } from '../layout/Container';
import { Button } from '../ui/Button';
import { ArrowRight } from 'lucide-react';

export function FinalCTA() {
  return (
    <section className="bg-[#0c1929] py-24 sm:py-32">
      <Container>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-poppins text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            Ready to escape tax software lock-in?
          </h2>
          <p className="text-lg text-[#d1d5db] max-w-2xl mx-auto mb-10 leading-relaxed">
            Repair your CSV in 30 seconds. Export to any tax platform. No commitments, no lock-in.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
            <Button variant="primary" href="#start" showArrow>
              Get Started Free
            </Button>
            <button
              className="h-12 px-8 rounded-full text-white border-2 border-white/30 bg-transparent hover:bg-white/10 active:bg-white/20 transition-all duration-300 ease-out focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 inline-flex items-center justify-center font-semibold text-base"
            >
              View Pricing
              <ArrowRight className="ml-2 h-4 w-4 flex-shrink-0" />
            </button>
          </div>
        </div>
      </Container>
    </section>
  );
}

