import React from 'react';
import { ApplicationStatus } from '../../types';
import {
  Bookmark,
  Send,
  Eye,
  Code2,
  Calendar,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArchiveX,
  Lock,
} from 'lucide-react';

interface StatusPillProps {
  status: ApplicationStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const getStatusConfig = (st: ApplicationStatus) => {
    switch (st) {
      case 'SAVED':
        return {
          label: 'Saved',
          bg: 'bg-slate-800/80 border-slate-700 text-slate-300',
          dot: 'bg-slate-400',
          icon: Bookmark,
        };
      case 'APPLIED':
        return {
          label: 'Applied',
          bg: 'bg-blue-950/60 border-blue-800/60 text-blue-300',
          dot: 'bg-blue-400',
          icon: Send,
        };
      case 'VIEWED':
        return {
          label: 'Viewed',
          bg: 'bg-purple-950/60 border-purple-800/60 text-purple-300',
          dot: 'bg-purple-400',
          icon: Eye,
        };
      case 'ASSESSMENT':
        return {
          label: 'Assessment',
          bg: 'bg-amber-950/60 border-amber-800/60 text-amber-300',
          dot: 'bg-amber-400',
          icon: Code2,
        };
      case 'INTERVIEW':
        return {
          label: 'Interview',
          bg: 'bg-indigo-950/60 border-indigo-800/60 text-indigo-300',
          dot: 'bg-indigo-400',
          icon: Calendar,
        };
      case 'OFFER':
        return {
          label: 'Offer',
          bg: 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300',
          dot: 'bg-emerald-400',
          icon: Sparkles,
        };
      case 'ACCEPTED':
        return {
          label: 'Accepted',
          bg: 'bg-teal-950/60 border-teal-800/60 text-teal-300',
          dot: 'bg-teal-400',
          icon: CheckCircle2,
        };
      case 'REJECTED':
        return {
          label: 'Rejected',
          bg: 'bg-rose-950/60 border-rose-800/60 text-rose-300',
          dot: 'bg-rose-400',
          icon: XCircle,
        };
      case 'WITHDRAWN':
        return {
          label: 'Withdrawn',
          bg: 'bg-zinc-800/80 border-zinc-700 text-zinc-400',
          dot: 'bg-zinc-500',
          icon: ArchiveX,
        };
      case 'CLOSED':
        return {
          label: 'Closed',
          bg: 'bg-gray-800/80 border-gray-700 text-gray-400',
          dot: 'bg-gray-500',
          icon: Lock,
        };
      default:
        return {
          label: st,
          bg: 'bg-slate-800 border-slate-700 text-slate-300',
          dot: 'bg-slate-400',
          icon: Bookmark,
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2 font-medium',
  };

  const iconSizes = {
    sm: 11,
    md: 13,
    lg: 15,
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.bg} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <Icon size={iconSizes[size]} className="shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
};
