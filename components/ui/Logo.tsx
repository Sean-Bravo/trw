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
      {/* Logo Icon */}
      <div className="relative w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm"
          role="img"
          aria-label="TaxFormatter logo"
        >
          {/* Blue Background with Rounded Corners */}
          <rect width="48" height="48" rx="12" fill="#3b82f6" />
          
          {/* Top Arrow: Points RIGHT (Shifted UP by 2px) */}
          <path
            d="M11 18.5 C16 16.5 28 15 37 17.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Top Arrowhead (Shifted UP by 2px) */}
          <path
            d="M31 13.5L37 17.5L32 22.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Bottom Arrow: Points LEFT (Shifted DOWN by 2px) */}
          <path
            d="M37 29.5 C32 31.5 20 33 11 30.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Bottom Arrowhead (Shifted DOWN by 2px) */}
          <path
            d="M17 34.5L11 30.5L16 25.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Logo Text */}
      {!iconOnly && (
        <span className={`font-poppins text-xl font-bold ${textColor} group-hover:text-[#3b82f6] transition-colors duration-300`}>
          TaxFormatter
        </span>
      )}
    </Link>
  );
}