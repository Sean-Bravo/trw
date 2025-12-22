import React from 'react';
import { Container } from '../layout/Container';
import { Accordion } from '../ui/Accordion';

const faqItems = [
  {
    question: 'How does the CSV repair process work?',
    answer: 'Upload your broken CSV file from any exchange. Our AI-powered engine automatically detects and fixes missing dates, incorrect formats, duplicate transactions, and other common issues. The repaired file is ready to download in seconds.',
  },
  {
    question: 'Is my data secure and private?',
    answer: 'Yes. All processing happens client-side in your browser. Your CSV files never leave your device. We use military-grade encryption and never store your data on our servers.',
  },
  {
    question: 'Which tax platforms are supported?',
    answer: 'We support all major tax platforms including Koinly, TurboTax, CoinLedger, ZenLedger, and more. You can export your repaired CSV in the exact format your tax software requires.',
  },
  {
    question: 'What if my exchange is not listed?',
    answer: 'Contact us with your exchange name and CSV format. We continuously add support for new exchanges based on user requests. Most exchanges can be supported within 24-48 hours.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'Yes. If our tool cannot repair your CSV file, we offer a full refund. We have a 99.9% success rate, but if you encounter any issues, contact our support team for immediate assistance.',
  },
];

export function FAQ() {
  return (
    <section className="bg-white py-24 sm:py-32">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-4 leading-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-[#4b5563] max-w-2xl mx-auto">
            Everything you need to know about TaxReadyWallet
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Accordion items={faqItems} />
        </div>

        <div className="text-center mt-10">
          <p className="text-[#4b5563]">
            Have more questions?{' '}
            <a href="#contact" className="text-[#059669] hover:text-[#047857] underline font-semibold">
              Contact Support
            </a>
          </p>
        </div>
      </Container>
    </section>
  );
}

