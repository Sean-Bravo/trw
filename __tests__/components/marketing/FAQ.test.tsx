import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FAQ } from '@/components/marketing/FAQ';

// Mock Container component
jest.mock('@/components/layout/Container', () => ({
  Container: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock FAQSchema component
jest.mock('@/components/seo/FAQSchema', () => ({
  FAQSchema: () => null,
}));

describe('FAQ Component', () => {
  describe('Rendering', () => {
    it('renders section title', () => {
      render(<FAQ />);
      expect(screen.getByText("Stuff you're actually wondering.")).toBeInTheDocument();
    });

    it('renders section subtitle', () => {
      render(<FAQ />);
      expect(screen.getByText(/Straight answers/)).toBeInTheDocument();
    });

    it('renders all FAQ questions', () => {
      render(<FAQ />);
      // Questions appear in both desktop and mobile layouts, use getAllByText
      expect(screen.getAllByText(/What exchanges do you actually support/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Will this work with my tax software/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Do you connect to my exchange accounts/).length).toBeGreaterThan(0);
    });

    it('renders contact email link', () => {
      render(<FAQ />);
      const emailLink = screen.getByText('Just email us');
      expect(emailLink).toHaveAttribute('href', 'mailto:support@taxformatter.com');
    });
  });

  describe('Desktop Interaction', () => {
    it('shows first question answer by default', () => {
      render(<FAQ />);
      // First item's answer should be visible (on desktop)
      // May appear multiple times due to desktop/mobile layouts
      expect(screen.getAllByText(/12 and counting/).length).toBeGreaterThan(0);
    });

    it('changes active question when clicked (desktop)', () => {
      render(<FAQ />);

      // Find all instances and click the first one (desktop)
      const taxSoftwareQuestions = screen.getAllByText(/Will this work with my tax software/);
      const button = taxSoftwareQuestions[0]?.closest('button');

      if (button) {
        fireEvent.click(button);
      }

      // Second answer should now be visible (may appear multiple times)
      expect(screen.getAllByText(/TurboTax, TaxAct, H&R Block/).length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('questions are focusable buttons', () => {
      render(<FAQ />);

      // Should have multiple button elements for questions
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('has proper section structure', () => {
      const { container } = render(<FAQ />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });
  });

  describe('Content', () => {
    it('mentions supported exchanges', () => {
      render(<FAQ />);
      // May appear multiple times due to desktop/mobile layouts
      expect(screen.getAllByText(/Coinbase, Kraken, Gemini/).length).toBeGreaterThan(0);
    });

    it('mentions tax software integrations', () => {
      render(<FAQ />);
      // Click on tax software question to see the answer
      const taxSoftwareQuestions = screen.getAllByText(/Will this work with my tax software/);
      const button = taxSoftwareQuestions[0]?.closest('button');
      if (button) {
        fireEvent.click(button);
      }

      // May appear multiple times due to desktop/mobile layouts
      expect(screen.getAllByText(/TurboTax, TaxAct, H&R Block/).length).toBeGreaterThan(0);
    });

    it('addresses privacy concerns', () => {
      render(<FAQ />);

      // Click on privacy question (get first instance - desktop)
      const privacyQuestions = screen.getAllByText(/Do you connect to my exchange accounts/);
      const button = privacyQuestions[0]?.closest('button');
      if (button) {
        fireEvent.click(button);
      }

      // Answer may appear multiple times in desktop/mobile views
      expect(screen.getAllByText(/No. Hard no/).length).toBeGreaterThan(0);
    });
  });
});
