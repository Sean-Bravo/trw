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
      {/* Logo Icon - Custom SVG matching the blue swap image with adjusted spacing */}
      <div className="relative w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm"
        >
          {/* Blue Background with Rounded Corners (Squircle) */}
          <rect width="48" height="48" rx="12" fill="#3b82f6" />
          
          {/* Top Arrow: Pointing LEFT (Moved up slightly to Y=16 center) */}
          <path
            d="M36 16H12" 
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 10L12 16L18 22"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Bottom Arrow: Pointing RIGHT (Moved down slightly to Y=32 center) */}
          <path
            d="M12 32H36"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M30 26L36 32L30 38"
            stroke="white"
            strokeWidth="3"
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