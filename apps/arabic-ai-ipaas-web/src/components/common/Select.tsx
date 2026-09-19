import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  helperText,
  error,
  options,
  id,
  className = '',
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5 text-start">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-primary font-arabic">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`w-full h-10 px-3.5 pe-9 bg-surface-container-lowest border rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 appearance-none transition-all duration-150 ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
              : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span
          className="material-symbols-outlined absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none"
          style={{ fontSize: '18px' }}
        >
          expand_more
        </span>
      </div>
      {error ? (
        <p className="text-xs text-rose-600 font-arabic">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-on-surface-variant font-arabic leading-relaxed">{helperText}</p>
      ) : null}
    </div>
  );
};
