import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`animate-pulse bg-slate-800/80 rounded-md ${className}`} />;
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-800/60">
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-48 h-4" />
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-20 h-6 rounded-full" />
          <Skeleton className="w-28 h-4 ml-auto" />
        </div>
      ))}
    </div>
  );
};
