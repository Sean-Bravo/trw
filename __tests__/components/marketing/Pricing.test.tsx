import React from 'react';
import { render, screen } from '@testing-library/react';
import { Pricing } from '@/components/marketing/Pricing';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('Pricing Component (API Tiers)', () => {
  describe('Rendering', () => {
    it('renders pricing section', () => {
      render(<Pricing />);
      const section = document.getElementById('pricing');
      expect(section).toBeInTheDocument();
    });

    it('renders API pricing header', () => {
      render(<Pricing />);
      expect(screen.getByText('API Pricing')).toBeInTheDocument();
      expect(screen.getByText('Pay for what you parse.')).toBeInTheDocument();
    });

    it('renders all three API tiers', () => {
      render(<Pricing />);
      expect(screen.getByText('Starter')).toBeInTheDocument();
      expect(screen.getByText('Growth')).toBeInTheDocument();
      expect(screen.getByText('Business')).toBeInTheDocument();
    });

    it('renders POPULAR badge on Growth tier', () => {
      render(<Pricing />);
      expect(screen.getByText('POPULAR')).toBeInTheDocument();
    });
  });

  describe('Starter Tier', () => {
    it('shows $29/month price', () => {
      render(<Pricing />);
      expect(screen.getByText('$29')).toBeInTheDocument();
    });

    it('shows 100 files per month', () => {
      render(<Pricing />);
      expect(screen.getByText('100 files / month')).toBeInTheDocument();
    });

    it('shows all 14 exchanges', () => {
      render(<Pricing />);
      expect(screen.getByText('All 14 exchanges')).toBeInTheDocument();
    });
  });

  describe('Growth Tier', () => {
    it('shows $99/month price', () => {
      render(<Pricing />);
      expect(screen.getByText('$99')).toBeInTheDocument();
    });

    it('shows 500 files per month', () => {
      render(<Pricing />);
      expect(screen.getByText('500 files / month')).toBeInTheDocument();
    });

    it('shows bank PDF parsing', () => {
      render(<Pricing />);
      expect(screen.getByText('Bank PDF parsing')).toBeInTheDocument();
    });
  });

  describe('Business Tier', () => {
    it('shows $249/month price', () => {
      render(<Pricing />);
      expect(screen.getByText('$249')).toBeInTheDocument();
    });

    it('shows 2,000 files per month', () => {
      render(<Pricing />);
      expect(screen.getByText('2,000 files / month')).toBeInTheDocument();
    });

    it('shows SLA guarantee', () => {
      render(<Pricing />);
      expect(screen.getByText('SLA guarantee')).toBeInTheDocument();
    });
  });

  describe('CTA Buttons', () => {
    it('starter tier links to signup', () => {
      render(<Pricing />);
      const starterButton = screen.getByText('Get Started');
      expect(starterButton.closest('a')).toHaveAttribute('href', '/signup?api_tier=starter');
    });

    it('growth tier links to signup', () => {
      render(<Pricing />);
      const growthButton = screen.getByText('Start Building');
      expect(growthButton.closest('a')).toHaveAttribute('href', '/signup?api_tier=growth');
    });

    it('business tier links to contact', () => {
      render(<Pricing />);
      const bizButton = screen.getByText('Contact Sales');
      expect(bizButton.closest('a')).toHaveAttribute('href', '/contact');
    });
  });

  describe('Footer', () => {
    it('mentions dashboard for non-developers', () => {
      render(<Pricing />);
      expect(screen.getByText(/Not a developer/)).toBeInTheDocument();
    });

    it('has link to dashboard', () => {
      render(<Pricing />);
      const dashLink = screen.getByText('taxformatter.com/dashboard');
      expect(dashLink).toHaveAttribute('href', '/dashboard');
    });
  });
});
