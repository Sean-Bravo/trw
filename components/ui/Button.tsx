import React from 'react';
import { ArrowRight } from 'lucide-react';
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
    primary: `h-10 px-6 rounded-full text-white bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)] active:bg-[var(--color-primary-700)] shadow-lg shadow-[var(--color-primary-500)]/25 hover:shadow-xl hover:shadow-[var(--color-primary-500)]/30 hover:-translate-y-0.5 focus-visible:outline-[var(--color-primary-500)] disabled:bg-slate-300 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0 font-poppins text-sm`,
    secondary: `h-10 px-6 rounded-full text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] border-2 border-[var(--color-primary-500)]/30 bg-white dark:bg-slate-900 hover:bg-[var(--color-primary-50)] dark:hover:bg-[var(--color-primary-500)]/10 hover:border-[var(--color-primary-500)]/50 hover:-translate-y-0.5 active:bg-[var(--color-primary-100)] focus-visible:outline-[var(--color-primary-500)] disabled:border-slate-200 disabled:text-slate-400 disabled:hover:translate-y-0 font-semibold text-sm`,
    tertiary: `inline text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)] font-semibold text-sm hover:underline active:text-[var(--color-primary-700)] focus-visible:outline-dotted focus-visible:outline-2 focus-visible:outline-[var(--color-primary-500)] disabled:text-slate-400`,
  };

  const buttonContent = (
    <>
      {children}
      {showArrow && variant !== 'tertiary' && (
        <ArrowRight className="ml-2 h-4 w-4 flex-shrink-0" />
      )}
      {showArrow && variant === 'tertiary' && (
        <ArrowRight className="ml-1 h-4 w-4 inline" />
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



