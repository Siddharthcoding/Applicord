import React from 'react';
import { Priority } from '../../types';

export const PriorityBadge: React.FC<{ priority: Priority; size?: 'sm' | 'md' }> = ({
  priority,
  size = 'md',
}) => {
  const configs: Record<Priority, { label: string; dot: string; text: string; bg: string }> = {
    LOW: { label: 'Low', dot: 'bg-slate-400', text: 'text-slate-400', bg: 'bg-slate-800/40 border-slate-700/60' },
    MEDIUM: { label: 'Medium', dot: 'bg-blue-400', text: 'text-blue-300', bg: 'bg-blue-950/40 border-blue-800/50' },
    HIGH: { label: 'High', dot: 'bg-amber-400', text: 'text-amber-300', bg: 'bg-amber-950/40 border-amber-800/50' },
    URGENT: { label: 'Urgent', dot: 'bg-rose-500', text: 'text-rose-300', bg: 'bg-rose-950/40 border-rose-800/50' },
  };

  const conf = configs[priority] || configs.MEDIUM;
  const sizeClass = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium ${conf.bg} ${conf.text} ${sizeClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
      {conf.label}
    </span>
  );
};
