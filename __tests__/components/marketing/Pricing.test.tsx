import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pricing } from '@/components/marketing/Pricing';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('Pricing Component', () => {
  describe('Rendering', () => {
    it('renders pricing section', () => {
      render(<Pricing />);
      // Check for section by ID and heading content
      const section = document.getElementById('pricing');
      expect(section).toBeInTheDocument();
      expect(screen.getByText('Transparent')).toBeInTheDocument();
    });

    it('renders all three pricing tiers', () => {
      render(<Pricing />);
      expect(screen.getByText('Starter')).toBeInTheDocument();
      expect(screen.getByText('Pro Pass')).toBeInTheDocument();
      expect(screen.getByText('Premium')).toBeInTheDocument();
    });

    it('renders free tier price', () => {
      render(<Pricing />);
      expect(screen.getByText('$0')).toBeInTheDocument();
      expect(screen.getByText('/ forever')).toBeInTheDocument();
    });

    it('renders MOST POPULAR badge on Pro tier', () => {
      render(<Pricing />);
      expect(screen.getByText('MOST POPULAR')).toBeInTheDocument();
    });
  });

  describe('Billing Toggle', () => {
    it('shows annual pricing by default', () => {
      render(<Pricing />);
      // Pro annual is $89
      expect(screen.getByText('$89')).toBeInTheDocument();
    });

    it('shows Save 17% badge on annual', () => {
      render(<Pricing />);
      expect(screen.getByText('Save 17%')).toBeInTheDocument();
    });

    it('switches to monthly pricing when toggled', () => {
      render(<Pricing />);

      // Find and click the toggle button
      const toggleButton = screen.getByLabelText('Toggle billing period');
      fireEvent.click(toggleButton);

      // Pro monthly is $9
      expect(screen.getByText('$9')).toBeInTheDocument();
    });

    it('hides Save badge when monthly selected', () => {
      render(<Pricing />);

      const toggleButton = screen.getByLabelText('Toggle billing period');
      fireEvent.click(toggleButton);

      expect(screen.queryByText('Save 17%')).not.toBeInTheDocument();
    });

    it('toggles back to annual', () => {
      render(<Pricing />);

      const toggleButton = screen.getByLabelText('Toggle billing period');
      fireEvent.click(toggleButton); // To monthly
      fireEvent.click(toggleButton); // Back to annual

      // Pro annual should be back
      expect(screen.getByText('$89')).toBeInTheDocument();
    });
  });

  describe('Free Tier Features', () => {
    it('shows 3 downloads per month', () => {
      render(<Pricing />);
      expect(screen.getByText('3 Downloads')).toBeInTheDocument();
      expect(screen.getByText('per Month')).toBeInTheDocument();
    });

    it('shows full export', () => {
      render(<Pricing />);
      expect(screen.getByText('Full Export Download')).toBeInTheDocument();
    });

    it('shows basic error detection', () => {
      render(<Pricing />);
      expect(screen.getByText('Basic Error Detection')).toBeInTheDocument();
    });
  });

  describe('Pro Tier Features', () => {
    it('shows unlimited uploads', () => {
      render(<Pricing />);
      // "Unlimited" is in a <strong> tag, "CSV Uploads" is separate text
      expect(screen.getByText('Unlimited')).toBeInTheDocument();
      expect(screen.getByText('CSV Uploads')).toBeInTheDocument();
    });

    it('shows full export capabilities', () => {
      render(<Pricing />);
      expect(screen.getByText('Full Export Capabilities')).toBeInTheDocument();
    });

    it('shows money back guarantee', () => {
      render(<Pricing />);
      expect(screen.getByText('30-Day Money Back Guarantee')).toBeInTheDocument();
    });
  });

  describe('Premium Tier Features', () => {
    it('shows AI PDF report', () => {
      render(<Pricing />);
      expect(screen.getByText('AI-Generated PDF Report')).toBeInTheDocument();
    });

    it('shows everything in Pro', () => {
      render(<Pricing />);
      expect(screen.getByText('Everything')).toBeInTheDocument();
      expect(screen.getByText('in Pro')).toBeInTheDocument();
    });

    it('shows priority support', () => {
      render(<Pricing />);
      expect(screen.getByText('Priority Support')).toBeInTheDocument();
    });
  });

  describe('CTA Buttons', () => {
    it('free tier links to signup', () => {
      render(<Pricing />);
      const freeButton = screen.getByText('Try For Free');
      expect(freeButton.closest('a')).toHaveAttribute('href', '/signup');
    });

    it('pro tier shows coming soon (disabled)', () => {
      render(<Pricing />);
      const comingSoonButtons = screen.getAllByText('Coming Soon');
      // Pro tier has Coming Soon button
      expect(comingSoonButtons.length).toBeGreaterThanOrEqual(1);
      // Pro button should be disabled
      const proButton = comingSoonButtons[0].closest('button');
      expect(proButton).toBeDisabled();
    });

    it('premium tier shows coming soon (disabled)', () => {
      render(<Pricing />);
      const comingSoonButtons = screen.getAllByText('Coming Soon');
      // Should have at least 2 Coming Soon buttons (Pro and Premium)
      expect(comingSoonButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Footer', () => {
    it('mentions Stripe payment processor', () => {
      render(<Pricing />);
      expect(screen.getByText(/Stripe/)).toBeInTheDocument();
    });

    it('has contact link', () => {
      render(<Pricing />);
      const contactLink = screen.getByText('Talk to us');
      expect(contactLink).toHaveAttribute('href', '/contact');
    });
  });
});
