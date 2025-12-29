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
        bg-white dark:bg-gray-800 border border-[var(--color-gray-200)] dark:border-gray-700 rounded-2xl p-8
        ${hover ? 'transition-shadow duration-300 ease-out shadow-[0_4px_12px_rgba(26,54,93,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_16px_rgba(26,54,93,0.1)] dark:hover:shadow-[0_8px_16px_rgba(0,0,0,0.4)]' : 'shadow-[0_4px_12px_rgba(26,54,93,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}


