import React from 'react';

export type BadgeVariant =
  | 'success'
  | 'active'
  | 'error'
  | 'failed'
  | 'warning'
  | 'pending'
  | 'neutral'
  | 'info'
  | 'primary';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  icon?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  icon,
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    active: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    error: 'bg-rose-50 text-rose-800 border-rose-200',
    failed: 'bg-rose-50 text-rose-800 border-rose-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-300',
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    info: 'bg-blue-50 text-secondary border-blue-200',
    primary: 'bg-primary text-white border-primary',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {icon && (
        <span className="material-symbols-outlined text-inherit select-none" style={{ fontSize: '14px' }}>
          {icon}
        </span>
      )}
      {children}
    </span>
  );
};
