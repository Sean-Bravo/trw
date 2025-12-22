import React from 'react';
import { AlertCircle, CheckCircle2, LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

export function Input({
  label,
  error,
  success,
  helperText,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = Boolean(error);
  const hasSuccess = Boolean(success);

  const baseStyles =
    'w-full px-4 py-3 text-base text-[#1a365d] bg-white border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0';

  const stateStyles = hasError
    ? 'border-[#ef4444] focus:ring-[#ef4444]/20'
    : hasSuccess
    ? 'border-[#059669] focus:ring-[#059669]/20'
    : 'border-[#d1d5db] focus:ring-[#059669]/20 hover:border-[#9ca3af]';

  const iconStyles = Icon
    ? iconPosition === 'left'
      ? 'pl-11'
      : 'pr-11'
    : '';

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-[#1a365d] mb-2"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 ${
              iconPosition === 'left' ? 'left-3' : 'right-3'
            }`}
          >
            <Icon className="h-5 w-5 text-[#6b7280]" />
          </div>
        )}

        <input
          id={inputId}
          className={`${baseStyles} ${stateStyles} ${iconStyles} disabled:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#9ca3af]`}
          aria-invalid={hasError}
          aria-describedby={
            error
              ? `${inputId}-error`
              : success
              ? `${inputId}-success`
              : helperText
              ? `${inputId}-helper`
              : undefined
          }
          {...props}
        />

        {(hasError || hasSuccess) && (
          <div className="absolute top-1/2 -translate-y-1/2 right-3">
            {hasError && (
              <AlertCircle className="h-5 w-5 text-[#ef4444]" aria-hidden="true" />
            )}
            {hasSuccess && (
              <CheckCircle2 className="h-5 w-5 text-[#059669]" aria-hidden="true" />
            )}
          </div>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} className="mt-2 text-sm text-[#ef4444] flex items-center gap-1">
          {error}
        </p>
      )}

      {success && !error && (
        <p id={`${inputId}-success`} className="mt-2 text-sm text-[#059669] flex items-center gap-1">
          {success}
        </p>
      )}

      {helperText && !error && !success && (
        <p id={`${inputId}-helper`} className="mt-2 text-sm text-[#6b7280]">
          {helperText}
        </p>
      )}
    </div>
  );
}
