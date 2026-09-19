import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  label = 'جارٍ التحميل...',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div className={`inline-flex items-center gap-2 text-on-surface-variant ${className}`} role="status">
      <div
        className={`${sizeClasses[size]} border-slate-300 border-t-secondary rounded-full animate-spin`}
        aria-hidden="true"
      />
      {label && <span className="text-sm font-medium">{label}</span>}
      <span className="sr-only">{label}</span>
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-6 w-full' }) => {
  return <div className={`bg-slate-200 animate-pulse rounded ${className}`} />;
};
