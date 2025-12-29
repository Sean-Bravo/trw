import React from 'react';
import { CheckCircle2, AlertTriangle, X, Info } from 'lucide-react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'tag';
  children: React.ReactNode;
  showIcon?: boolean;
  className?: string;
}

export function Badge({
  variant = 'success',
  children,
  showIcon = true,
  className = '',
}: BadgeProps) {
  const variants = {
    success: {
      container: 'bg-[#d1fae5] border border-[#059669] text-[#065f46]',
      icon: CheckCircle2,
      iconColor: '#059669',
    },
    warning: {
      container: 'bg-[#fef3c7] border border-[#f59e0b] text-[#78350f]',
      icon: AlertTriangle,
      iconColor: '#f59e0b',
    },
    error: {
      container: 'bg-[#fee2e2] border border-[#ef4444] text-[#7f1d1d]',
      icon: X,
      iconColor: '#ef4444',
    },
    info: {
      container: 'bg-[#dbeafe] border border-[#3b82f6] text-[#1e3a8a]',
      icon: Info,
      iconColor: '#3b82f6',
    },
    tag: {
      container: 'bg-[#059669] border-none text-white uppercase tracking-wider',
      icon: null,
      iconColor: '',
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
        text-xs font-semibold
        ${config.container}
        ${className}
      `}
    >
      {showIcon && Icon && (
        <Icon className="h-3 w-3 flex-shrink-0" style={{ color: config.iconColor }} />
      )}
      {children}
    </span>
  );
}


