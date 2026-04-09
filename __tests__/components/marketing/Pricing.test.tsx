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
    // L-1: tier CTAs are buttons that stash sessionStorage and
    // router.push('/signup'), no longer <Link href='/signup?api_tier=X'>.
    // We assert the buttons render with the right labels and that they
    // don't leak the tier through the URL.
    it('renders three tier CTA buttons (no api_tier in URL)', () => {
      render(<Pricing />);
      // The three tier CTAs are Starter / Growth / Business.
      const ctaLabels = ['Get Started', 'Start Building', 'Get Started'];
      const buttons = screen.getAllByRole('button');
      const ctaButtons = buttons.filter((b) =>
        ctaLabels.includes(b.textContent?.trim() || ''),
      );
      expect(ctaButtons.length).toBeGreaterThanOrEqual(3);

      // No <a> link should still carry api_tier as a query param.
      const links = screen.getAllByRole('link');
      const tierLinks = links.filter((l) =>
        l.getAttribute('href')?.includes('api_tier='),
      );
      expect(tierLinks).toHaveLength(0);
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
