import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  helperText,
  error,
  id,
  rows = 3,
  className = '',
  ...props
}) => {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5 text-start">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-semibold text-primary font-arabic">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={`w-full p-3.5 bg-surface-container-lowest border rounded-lg text-sm text-on-surface placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all duration-150 leading-relaxed ${
          error
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
            : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-xs text-rose-600 font-arabic">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-on-surface-variant font-arabic leading-relaxed">{helperText}</p>
      ) : null}
    </div>
  );
};
