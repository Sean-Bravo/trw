import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = true }: CardProps) {
  return (
    <div
      className={`
        bg-white border border-[#e5e7eb] rounded-2xl p-8
        ${hover ? 'transition-shadow duration-300 ease-out shadow-[0_4px_12px_rgba(26,54,93,0.15)] hover:shadow-[0_8px_16px_rgba(26,54,93,0.1)]' : 'shadow-[0_4px_12px_rgba(26,54,93,0.15)]'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

