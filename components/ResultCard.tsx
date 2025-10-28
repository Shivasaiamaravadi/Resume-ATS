
import React from 'react';

interface ResultCardProps {
  title: string;
  children: React.ReactNode;
}

export const ResultCard: React.FC<ResultCardProps> = ({ title, children }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 h-full">
      <h3 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">{title}</h3>
      <div>{children}</div>
    </div>
  );
};
