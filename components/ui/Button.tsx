import React from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary';
  href?: string;
  children: React.ReactNode;
  showArrow?: boolean;
}

export function Button({
  variant = 'primary',
  href,
  children,
  showArrow = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60';
  
  const variants = {
    primary: `h-12 px-8 rounded-full text-white bg-[#059669] hover:bg-[#047857] active:bg-[#065f46] shadow-[0_4px_12px_rgba(5,150,105,0.15)] hover:shadow-[0_8px_16px_rgba(5,150,105,0.2)] focus-visible:outline-[#059669] disabled:bg-[#d1d5db] disabled:text-[#6b7280] disabled:shadow-none font-poppins text-base`,
    secondary: `h-12 px-8 rounded-full text-[#1a365d] border-2 border-[#1a365d] bg-transparent hover:bg-[#1a365d] hover:text-white hover:shadow-[0_4px_12px_rgba(26,54,93,0.15)] active:bg-[#1e3a8a] focus-visible:outline-[#1a365d] disabled:border-[#d1d5db] disabled:text-[#9ca3af] font-semibold text-base`,
    tertiary: `inline text-[#059669] underline font-semibold text-sm hover:text-[#047857] active:text-[#065f46] focus-visible:outline-dotted focus-visible:outline-2 focus-visible:outline-[#059669] disabled:text-[#9ca3af]`,
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
        {...(props as any)}
      >
        {buttonContent}
      </Link>
    );
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {buttonContent}
    </button>
  );
}

