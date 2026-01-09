import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('renders as button element by default', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders as link when href is provided', () => {
      render(<Button href="/dashboard">Go to Dashboard</Button>);
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Variants', () => {
    it('applies primary variant styles by default', () => {
      render(<Button>Primary</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-[var(--color-primary-500)]');
    });

    it('applies secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('border-2');
      expect(button.className).toContain('border-[var(--color-primary-500)]');
    });

    it('applies tertiary variant styles', () => {
      render(<Button variant="tertiary">Tertiary</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('hover:underline');
    });
  });

  describe('Arrow Icon', () => {
    it('does not show arrow by default', () => {
      render(<Button>No Arrow</Button>);
      const svg = document.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });

    it('shows arrow when showArrow is true', () => {
      render(<Button showArrow>With Arrow</Button>);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('shows arrow with ml-2 for primary/secondary variants', () => {
      render(<Button showArrow variant="primary">Arrow</Button>);
      const svg = document.querySelector('svg');
      expect(svg).toHaveClass('ml-2');
    });

    it('shows arrow with ml-1 for tertiary variant', () => {
      render(<Button showArrow variant="tertiary">Arrow</Button>);
      const svg = document.querySelector('svg');
      expect(svg).toHaveClass('ml-1');
    });
  });

  describe('Disabled State', () => {
    it('applies disabled attribute when disabled', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('does not trigger onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('applies disabled styles', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('disabled:cursor-not-allowed');
      expect(button.className).toContain('disabled:opacity-60');
    });
  });

  describe('Click Handler', () => {
    it('calls onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not error when no onClick provided', () => {
      render(<Button>No handler</Button>);
      const button = screen.getByRole('button');
      expect(() => fireEvent.click(button)).not.toThrow();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('combines custom className with default styles', () => {
      render(<Button className="my-custom">Combined</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('my-custom');
      expect(button.className).toContain('inline-flex');
    });
  });

  describe('Link Variant', () => {
    it('renders Link component when href provided', () => {
      render(<Button href="/test">Link Button</Button>);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/test');
    });

    it('applies variant styles to link', () => {
      render(<Button href="/test" variant="secondary">Secondary Link</Button>);
      const link = screen.getByRole('link');
      expect(link.className).toContain('border-2');
    });

    it('shows arrow on link when showArrow is true', () => {
      render(<Button href="/test" showArrow>Link with Arrow</Button>);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct base styles for focus visibility', () => {
      render(<Button>Accessible</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('focus-visible:outline-2');
      expect(button.className).toContain('focus-visible:outline-offset-2');
    });

    it('is keyboard accessible', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Keyboard</Button>);
      const button = screen.getByRole('button');
      button.focus();
      fireEvent.keyDown(button, { key: 'Enter' });
      // Note: fireEvent.keyDown doesn't trigger click, but button is focusable
      expect(button).toHaveFocus();
    });
  });
});
