import React from 'react';
import { LoadingSpinner } from './LoadingSpinner.js';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: string;
  iconTrailing?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon,
  iconTrailing,
  className = '',
  ...props
}) => {
  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-primary text-white hover:bg-primary-container active:bg-slate-900 border border-transparent shadow-sm',
    secondary:
      'bg-secondary text-white hover:bg-secondary-container active:bg-blue-800 border border-transparent shadow-sm',
    outline:
      'bg-surface-container-lowest text-primary hover:bg-surface-container-low active:bg-slate-100 border border-outline-variant',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 border border-transparent shadow-sm',
    ghost:
      'bg-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface border border-transparent',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-xs h-8 px-2.5 gap-1.5 rounded',
    md: 'text-sm h-10 px-4 gap-2 rounded-lg font-medium',
    lg: 'text-base h-12 px-6 gap-2.5 rounded-lg font-semibold',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center transition-all duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <LoadingSpinner size="sm" label="" />
      ) : (
        icon && (
          <span className="material-symbols-outlined text-inherit select-none" style={{ fontSize: '18px' }}>
            {icon}
          </span>
        )
      )}
      <span>{children}</span>
      {!isLoading && iconTrailing && (
        <span className="material-symbols-outlined text-inherit select-none" style={{ fontSize: '18px' }}>
          {iconTrailing}
        </span>
      )}
    </button>
  );
};
