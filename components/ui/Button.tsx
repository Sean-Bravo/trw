import React from 'react';
import { ArrowRight } from '@phosphor-icons/react';
import Link from 'next/link';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary';
  href?: string;
  children: React.ReactNode;
  showArrow?: boolean;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function Button({
  variant = 'primary',
  href,
  children,
  showArrow = false,
  className = '',
  disabled,
  onClick,
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60';
  
  const variants = {
    primary: `h-12 px-8 rounded-full text-white bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-dark)] active:bg-[var(--color-brand-blue-darker)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] focus-visible:outline-[var(--color-brand-blue)] disabled:bg-[var(--color-gray-300)] disabled:text-[var(--color-gray-500)] disabled:shadow-none font-poppins text-base`,
    secondary: `h-12 px-8 rounded-full text-[var(--color-brand-navy)] border-2 border-[var(--color-brand-navy)] bg-transparent hover:bg-[var(--color-brand-navy)] hover:text-white hover:shadow-[var(--shadow-card)] active:bg-[var(--color-brand-blue-darker)] focus-visible:outline-[var(--color-brand-navy)] disabled:border-[var(--color-gray-300)] disabled:text-[var(--color-gray-400)] font-semibold text-base`,
    tertiary: `inline text-[var(--color-brand-blue)] underline font-semibold text-sm hover:text-[var(--color-brand-blue-dark)] active:text-[var(--color-brand-blue-darker)] focus-visible:outline-dotted focus-visible:outline-2 focus-visible:outline-[var(--color-brand-blue)] disabled:text-[var(--color-gray-400)]`,
  };

  const buttonContent = (
    <>
      {children}
      {showArrow && variant !== 'tertiary' && (
        <ArrowRight size={16} weight="bold" className="ml-2 flex-shrink-0" />
      )}
      {showArrow && variant === 'tertiary' && (
        <ArrowRight size={16} weight="bold" className="ml-1 inline" />
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`${baseStyles} ${variants[variant]} ${className}`}
      >
        {buttonContent}
      </Link>
    );
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {buttonContent}
    </button>
  );
}

