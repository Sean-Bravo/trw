import React from 'react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  variant?: 'light' | 'dark';
}

export function Logo({ className = '', iconOnly = false, variant = 'dark' }: LogoProps) {
  const textColor = variant === 'light' ? 'text-white' : 'text-[#1a365d]';

  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-3 group ${className}`}
    >
      {/* Logo Icon - Double Arrow */}
      <div className="relative w-10 h-10 bg-[#3b82f6] rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-white"
        >
          {/* Double horizontal arrows pointing right */}
          <path
            d="M14 7l5 5-5 5M9 7l5 5-5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Logo Text */}
      {!iconOnly && (
        <span className={`font-poppins text-xl font-bold ${textColor} group-hover:text-[#3b82f6] transition-colors duration-300`}>
          TaxReadyWallet
        </span>
      )}
    </Link>
  );
}
