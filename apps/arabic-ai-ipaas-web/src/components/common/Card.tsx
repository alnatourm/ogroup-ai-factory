import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm transition-all duration-150 ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className = '' }) => {
  return (
    <div className={`p-5 border-b border-slate-100 flex items-center justify-between gap-4 ${className}`}>
      <div className="space-y-0.5">
        <h3 className="text-base font-bold text-primary font-arabic">{title}</h3>
        {subtitle && <p className="text-xs text-on-surface-variant font-arabic leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
};

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <div className={`p-5 ${className}`}>{children}</div>;
};

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`p-4 bg-slate-50 border-t border-slate-100 rounded-b-xl flex items-center justify-between gap-4 ${className}`}>
      {children}
    </div>
  );
};
