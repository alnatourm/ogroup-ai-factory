import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: string;
  iconTrailing?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  icon,
  iconTrailing,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5 text-start">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-primary font-arabic">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span
            className="material-symbols-outlined absolute start-3 text-slate-400 pointer-events-none select-none"
            style={{ fontSize: '18px' }}
          >
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full h-10 bg-surface-container-lowest border rounded-lg text-sm text-on-surface placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all duration-150 ${
            icon ? 'ps-9' : 'ps-3.5'
          } ${iconTrailing ? 'pe-9' : 'pe-3.5'} ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
              : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'
          } ${className}`}
          {...props}
        />
        {iconTrailing && (
          <span
            className="material-symbols-outlined absolute end-3 text-slate-400 pointer-events-none select-none"
            style={{ fontSize: '18px' }}
          >
            {iconTrailing}
          </span>
        )}
      </div>
      {error ? (
        <p className="text-xs text-rose-600 font-arabic">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-on-surface-variant font-arabic leading-relaxed">{helperText}</p>
      ) : null}
    </div>
  );
};
