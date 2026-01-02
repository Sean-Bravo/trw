import React from 'react';

interface GlassProps {
  children: React.ReactNode;
  className?: string;
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
}

export function Glass({
  children,
  className = '',
  blur = 'md',
  variant = 'light'
}: GlassProps) {
  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl',
  };

  const variantClasses = {
    light: 'bg-white/70 dark:bg-slate-900/70 border-white/20 dark:border-slate-700/50',
    dark: 'bg-slate-900/80 border-white/10',
  };

  return (
    <div
      className={`
        ${blurClasses[blur]}
        ${variantClasses[variant]}
        border
        shadow-lg shadow-black/5
        ${className}
      `}
    >
      {children}
    </div>
  );
}
