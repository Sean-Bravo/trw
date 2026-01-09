import React from 'react';
import { render, screen } from '@testing-library/react';
import { Hero } from '@/components/marketing/Hero';

// Mock Container component
jest.mock('@/components/layout/Container', () => ({
  Container: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Button component
jest.mock('@/components/ui/Button', () => ({
  Button: ({
    children,
    href,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
    className?: string;
  }) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}));

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  trackSignUp: jest.fn(),
}));

describe('Hero Component', () => {
  describe('Rendering', () => {
    it('renders main headline', () => {
      render(<Hero />);
      expect(screen.getByText(/Fix Your Broken Exchange CSVs/)).toBeInTheDocument();
    });

    it('renders sub-headline', () => {
      render(<Hero />);
      expect(screen.getByText(/in Seconds/)).toBeInTheDocument();
    });

    it('renders description text', () => {
      render(<Hero />);
      expect(screen.getByText(/Your exchange exported garbage/)).toBeInTheDocument();
    });

    it('renders AI-Powered badge', () => {
      render(<Hero />);
      expect(screen.getByText('AI-Powered CSV Repair')).toBeInTheDocument();
    });
  });

  describe('CTA Buttons', () => {
    it('renders primary CTA button', () => {
      render(<Hero />);
      const ctaButton = screen.getByText('Fix Now');
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton).toHaveAttribute('href', '/signup');
    });

    it('renders secondary CTA button', () => {
      render(<Hero />);
      const pricingButton = screen.getByText('View Pricing');
      expect(pricingButton).toBeInTheDocument();
      expect(pricingButton).toHaveAttribute('href', '#pricing');
    });
  });

  describe('Trust Indicators', () => {
    it('shows files processed count', () => {
      render(<Hero />);
      expect(screen.getByText(/10,000\+ files processed/)).toBeInTheDocument();
    });

    it('shows accuracy rate', () => {
      render(<Hero />);
      expect(screen.getByText(/99.9% accuracy/)).toBeInTheDocument();
    });

    it('shows exchange count', () => {
      render(<Hero />);
      expect(screen.getByText(/Works with 12 exchanges/)).toBeInTheDocument();
    });
  });

  describe('Sample Link', () => {
    it('renders sample output link', () => {
      render(<Hero />);
      const sampleLink = screen.getByText(/See sample outputs first/);
      expect(sampleLink).toHaveAttribute('href', '/samples');
    });
  });

  describe('Product Preview', () => {
    it('shows TaxFormatter Pro label', () => {
      render(<Hero />);
      expect(screen.getByText('TaxFormatter Pro')).toBeInTheDocument();
    });

    it('shows Before/After comparison', () => {
      render(<Hero />);
      expect(screen.getByText('Before')).toBeInTheDocument();
      expect(screen.getByText('After')).toBeInTheDocument();
    });

    it('shows AI Enhanced badge', () => {
      render(<Hero />);
      expect(screen.getByText('AI Enhanced')).toBeInTheDocument();
    });

    it('shows issues fixed count', () => {
      render(<Hero />);
      expect(screen.getByText('4 issues fixed')).toBeInTheDocument();
    });

    it('shows ready for export text', () => {
      render(<Hero />);
      expect(screen.getByText(/Ready for export/)).toBeInTheDocument();
    });
  });

  describe('Sample CSV Content', () => {
    it('shows before CSV with errors', () => {
      render(<Hero />);
      // Header appears in both before and after, use getAllByText
      expect(screen.getAllByText('date,type,amount,currency').length).toBeGreaterThan(0);
      expect(screen.getByText('N/A,UNKNOWN,???,ETH')).toBeInTheDocument();
    });

    it('shows fixed after CSV', () => {
      render(<Hero />);
      expect(screen.getByText('2024-01-18,TRANSFER,0.25,ETH')).toBeInTheDocument();
      expect(screen.getByText('2024-01-20,SELL,1.2,ETH')).toBeInTheDocument();
    });
  });

  describe('Structure', () => {
    it('renders as section element', () => {
      const { container } = render(<Hero />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('renders h1 heading', () => {
      render(<Hero />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });
  });
});
