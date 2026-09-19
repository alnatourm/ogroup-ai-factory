import React from 'react';
import { Button } from './Button.js';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'تنبيه خطأ',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`p-4 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-900 flex items-start justify-between gap-3 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-rose-600 mt-0.5" style={{ fontSize: '20px' }}>
          error
        </span>
        <div>
          <h4 className="text-sm font-bold font-arabic">{title}</h4>
          <p className="text-xs text-rose-700 mt-0.5 font-arabic leading-relaxed">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
};
