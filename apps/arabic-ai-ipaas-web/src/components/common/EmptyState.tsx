import React from 'react';
import { Button } from './Button.js';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`p-10 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 ${className}`}
    >
      <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined select-none" style={{ fontSize: '28px' }}>
          {icon}
        </span>
      </div>
      <h4 className="text-base font-bold text-primary mb-1 font-arabic">{title}</h4>
      <p className="text-xs text-on-surface-variant max-w-sm mb-5 font-arabic leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
