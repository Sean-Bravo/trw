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
      expect(screen.getByText('Things devs actually ask.')).toBeInTheDocument();
    });

    it('renders section subtitle', () => {
      render(<FAQ />);
      expect(screen.getByText(/No fluff/)).toBeInTheDocument();
    });

    it('renders FAQ questions', () => {
      render(<FAQ />);
      expect(screen.getAllByText(/How does the API detect which exchange/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/What does the MCP server actually do/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Do you store the files I send/).length).toBeGreaterThan(0);
    });
  });

  describe('Desktop Interaction', () => {
    it('shows first question answer by default', () => {
      render(<FAQ />);
      expect(screen.getAllByText(/Header fingerprinting/).length).toBeGreaterThan(0);
    });

    it('changes active question when clicked (desktop)', () => {
      render(<FAQ />);

      const mcpQuestions = screen.getAllByText(/What does the MCP server actually do/);
      const button = mcpQuestions[0]?.closest('button');

      if (button) {
        fireEvent.click(button);
      }

      expect(screen.getAllByText(/wraps our REST API/).length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('questions are focusable buttons', () => {
      render(<FAQ />);

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
    it('mentions API detection', () => {
      render(<FAQ />);
      expect(screen.getAllByText(/Header fingerprinting/).length).toBeGreaterThan(0);
    });

    it('addresses file storage concerns', () => {
      render(<FAQ />);
      const privacyQuestions = screen.getAllByText(/Do you store the files I send/);
      const button = privacyQuestions[0]?.closest('button');
      if (button) {
        fireEvent.click(button);
      }

      expect(screen.getAllByText(/processed in-memory/).length).toBeGreaterThan(0);
    });

    it('mentions pricing', () => {
      render(<FAQ />);
      const pricingQuestions = screen.getAllByText(/What's the cheapest plan/);
      const button = pricingQuestions[0]?.closest('button');
      if (button) {
        fireEvent.click(button);
      }

      expect(screen.getAllByText(/Starter is \$29/).length).toBeGreaterThan(0);
    });
  });
});
