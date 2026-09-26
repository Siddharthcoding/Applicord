import React from 'react';
import { HistorySource } from '../../types';
import { Mail, User, Chrome, Server, FileSpreadsheet } from 'lucide-react';

export const HistorySourceBadge: React.FC<{ source: HistorySource }> = ({ source }) => {
  const getSourceConfig = (src: HistorySource) => {
    switch (src) {
      case 'EMAIL':
        return {
          label: 'Detected from email',
          bg: 'bg-indigo-950/70 text-indigo-300 border-indigo-800/60',
          icon: Mail,
        };
      case 'MANUAL':
        return {
          label: 'Added manually',
          bg: 'bg-slate-800/80 text-slate-300 border-slate-700',
          icon: User,
        };
      case 'BROWSER_EXTENSION':
        return {
          label: 'Browser extension',
          bg: 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60',
          icon: Chrome,
        };
      case 'IMPORT':
        return {
          label: 'Imported from file',
          bg: 'bg-amber-950/70 text-amber-300 border-amber-800/60',
          icon: FileSpreadsheet,
        };
      case 'SYSTEM':
      default:
        return {
          label: 'System automation',
          bg: 'bg-purple-950/70 text-purple-300 border-purple-800/60',
          icon: Server,
        };
    }
  };

  const config = getSourceConfig(source);
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${config.bg}`}
    >
      <Icon size={11} />
      <span>{config.label}</span>
    </span>
  );
};
