import React, { useEffect, useRef } from 'react';
import { Button } from './Button.js';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  isConfirmLoading?: boolean;
  confirmVariant?: 'primary' | 'secondary' | 'danger';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  confirmText,
  cancelText = 'إلغاء',
  onConfirm,
  isConfirmLoading = false,
  confirmVariant = 'primary',
  maxWidth = 'md',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`bg-surface-container-lowest border border-outline-variant w-full ${widthClasses[maxWidth]} rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] transition-all`}
      >
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-primary font-arabic">{title}</h2>
            {description && <p className="text-xs text-on-surface-variant font-arabic">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="إغلاق"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        {(onConfirm || confirmText) && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button variant="outline" size="md" onClick={onClose} disabled={isConfirmLoading}>
              {cancelText}
            </Button>
            {onConfirm && (
              <Button
                variant={confirmVariant}
                size="md"
                onClick={onConfirm}
                isLoading={isConfirmLoading}
              >
                {confirmText || 'تأكيد'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
