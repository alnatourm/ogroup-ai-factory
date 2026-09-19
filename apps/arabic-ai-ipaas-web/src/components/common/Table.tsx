import React from 'react';

export const Table: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest ${className}`}>
      <table className="w-full text-start text-sm">{children}</table>
    </div>
  );
};

export const TableHead: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <thead className={`bg-slate-50 border-b border-outline-variant text-xs text-on-surface-variant font-semibold ${className}`}>{children}</thead>;
};

export const TableBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <tbody className={`divide-y divide-slate-100 ${className}`}>{children}</tbody>;
};

export const TableRow: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = '', onClick }) => {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors hover:bg-slate-50/75 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
};

export const TableHeaderCell: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return <th className={`py-3.5 px-4 text-start font-arabic ${className}`}>{children}</th>;
};

export const TableCell: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return <td className={`py-3.5 px-4 text-start text-on-surface align-middle ${className}`}>{children}</td>;
};
