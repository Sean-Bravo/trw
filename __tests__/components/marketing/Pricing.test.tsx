import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pricing } from '@/components/marketing/Pricing';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock next/navigation router so we can assert the Free CTA wires to /signup.
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

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

    it('renders all four API tiers (Phase 5: Free added)', () => {
      render(<Pricing />);
      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.getByText('Starter')).toBeInTheDocument();
      expect(screen.getByText('Growth')).toBeInTheDocument();
      expect(screen.getByText('Business')).toBeInTheDocument();
    });

    it('renders POPULAR badge on Growth tier', () => {
      render(<Pricing />);
      expect(screen.getByText('POPULAR')).toBeInTheDocument();
    });
  });

  describe('Free Tier (Phase 5, v3)', () => {
    it('shows $0/month price', () => {
      render(<Pricing />);
      expect(screen.getByText('$0')).toBeInTheDocument();
    });

    it('shows 25 files per month', () => {
      render(<Pricing />);
      expect(screen.getByText('25 files / month')).toBeInTheDocument();
    });

    it('shows 10 requests per minute', () => {
      render(<Pricing />);
      expect(screen.getByText('10 requests / minute')).toBeInTheDocument();
    });

    it('shows "No credit card required" microcopy on Free card only', () => {
      render(<Pricing />);
      const microcopy = screen.getAllByText('No credit card required');
      expect(microcopy).toHaveLength(1);
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

    it('shows all 14 exchanges (also appears on Free)', () => {
      render(<Pricing />);
      // Both Free and Starter list this feature.
      expect(screen.getAllByText('All 14 exchanges').length).toBeGreaterThanOrEqual(1);
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
    it('renders four tier CTA buttons (no api_tier in URL)', () => {
      render(<Pricing />);
      // Four tier CTAs after Phase 5: Start Free / Get Started / Start Building / Get Started.
      const ctaLabels = ['Start Free', 'Get Started', 'Start Building'];
      const buttons = screen.getAllByRole('button');
      const ctaButtons = buttons.filter((b) =>
        ctaLabels.includes(b.textContent?.trim() || ''),
      );
      expect(ctaButtons.length).toBeGreaterThanOrEqual(4);

      // No <a> link should still carry api_tier as a query param.
      const links = screen.getAllByRole('link');
      const tierLinks = links.filter((l) =>
        l.getAttribute('href')?.includes('api_tier='),
      );
      expect(tierLinks).toHaveLength(0);
    });

    it('Free CTA stores tier="free" in sessionStorage and routes to /signup', async () => {
      mockPush.mockClear();
      const user = userEvent.setup();
      render(<Pricing />);

      const freeBtn = screen.getByRole('button', { name: /Start Free/i });
      await user.click(freeBtn);

      expect(sessionStorage.getItem('pending_api_tier')).toBe('free');
      expect(mockPush).toHaveBeenCalledWith('/signup');
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
