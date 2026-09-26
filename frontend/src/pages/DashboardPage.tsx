import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { DashboardSummary } from '../types';
import {
  Briefcase,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  Building2,
} from 'lucide-react';
import { StatusPill } from '../components/common/StatusPill';
import { HistorySourceBadge } from '../components/common/HistorySourceBadge';
import { Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { onOpenAddModal } = useOutletContext<{ onOpenAddModal: () => void }>();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest<DashboardSummary>('/analytics/dashboard');
      setData(res);
    } catch (err) {
      console.error('Error fetching dashboard summary', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('applylog_application_created', loadData);
    return () => window.removeEventListener('applylog_application_created', loadData);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (!data || data.totalApplications === 0) {
    return (
      <div className="py-8">
        <EmptyState
          icon={Briefcase}
          title="Welcome to Applicord"
          description="Every application. One timeline. Start tracking your submitted job applications to build your personal command center."
          actionLabel="+ Add Your First Application"
          onAction={onOpenAddModal}
        />
      </div>
    );
  }

  const statusList = [
    { status: 'APPLIED', count: data.statusCounts.APPLIED || 0 },
    { status: 'VIEWED', count: data.statusCounts.VIEWED || 0 },
    { status: 'ASSESSMENT', count: data.statusCounts.ASSESSMENT || 0 },
    { status: 'INTERVIEW', count: data.statusCounts.INTERVIEW || 0 },
    { status: 'OFFER', count: data.statusCounts.OFFER || 0 },
    { status: 'REJECTED', count: data.statusCounts.REJECTED || 0 },
  ] as const;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Job Application Command Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status tracking, automated follow-ups, and complete timeline records.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/automation')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>Automation Hub</span>
          </button>
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Plus size={15} />
            <span>Add Application</span>
          </button>
        </div>
      </div>

      {/* Top Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applications */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Tracked</span>
            <div className="p-2 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-800/40">
              <Briefcase size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-100">{data.totalApplications}</div>
            <span className="text-[11px] text-slate-500 font-medium">All recorded submissions</span>
          </div>
        </div>

        {/* Active In-Progress Applications */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Pipelines</span>
            <div className="p-2 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-800/40">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-100">{data.activeApplications}</div>
            <span className="text-[11px] text-blue-400/90 font-medium">Under active review</span>
          </div>
        </div>

        {/* In Interview or Offer */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Interviews & Offers</span>
            <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-emerald-400">
              {(data.statusCounts.INTERVIEW || 0) + (data.statusCounts.OFFER || 0) + (data.statusCounts.ACCEPTED || 0)}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {data.statusCounts.INTERVIEW || 0} interviews, {data.statusCounts.OFFER || 0} offers
            </span>
          </div>
        </div>

        {/* Follow-ups Due */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Needs Attention</span>
            <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/40">
              <AlertCircle size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-amber-300">
              {data.needsAttention.overdueFollowUps + data.needsAttention.followUpsToday + data.needsAttention.pendingSuggestions}
            </div>
            <span className="text-[11px] text-amber-400/90 font-medium">
              {data.needsAttention.overdueFollowUps} overdue, {data.needsAttention.pendingSuggestions} suggestions
            </span>
          </div>
        </div>
      </div>

      {/* Needs Attention Action Banner */}
      {(data.needsAttention.overdueFollowUps > 0 || data.needsAttention.pendingSuggestions > 0) && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-900/40 border border-amber-700/50 text-amber-300 shrink-0 mt-0.5 sm:mt-0">
              <AlertCircle size={18} />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-amber-200">Action Required on Your Pipeline</h4>
              <p className="text-xs text-amber-300/80 mt-0.5">
                {data.needsAttention.overdueFollowUps > 0 && `${data.needsAttention.overdueFollowUps} follow-up reminder(s) are overdue. `}
                {data.needsAttention.pendingSuggestions > 0 && `${data.needsAttention.pendingSuggestions} email update suggestion(s) ready for review.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.needsAttention.overdueFollowUps > 0 && (
              <button
                onClick={() => navigate('/calendar')}
                className="px-3 py-1.5 rounded-lg bg-amber-900/50 hover:bg-amber-800/60 text-amber-100 text-xs font-medium transition-colors"
              >
                View Reminders
              </button>
            )}
            {data.needsAttention.pendingSuggestions > 0 && (
              <button
                onClick={() => navigate('/automation')}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm"
              >
                Review Suggestions
              </button>
            )}
          </div>
        </div>
      )}

      {/* Status Breakdown Row */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-200">Current Pipeline Stages</h3>
          <button
            onClick={() => navigate('/kanban')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            <span>Open Kanban Board</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statusList.map((item) => (
            <div
              key={item.status}
              onClick={() => navigate(`/applications?status=${item.status}`)}
              className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 cursor-pointer transition-all flex flex-col justify-between"
            >
              <StatusPill status={item.status} size="sm" />
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-100">{item.count}</span>
                <span className="text-[11px] text-slate-500">apps</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-200">Recent Status Activity</h3>
          <button
            onClick={() => navigate('/applications')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            <span>View All Applications</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden divide-y divide-slate-800/60">
          {data.recentActivity && data.recentActivity.length > 0 ? (
            data.recentActivity.map((item: any) => (
              <div
                key={item.id}
                onClick={() => navigate(`/applications/${item.application?.id}`)}
                className="p-4 hover:bg-slate-800/40 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-400 shrink-0">
                    {item.application?.company?.name?.charAt(0) || <Building2 size={14} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-100">
                        {item.application?.company?.name}
                      </span>
                      <span className="text-xs text-slate-400">— {item.application?.jobTitle}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusPill status={item.status} size="sm" />
                      <HistorySourceBadge source={item.source} />
                      {item.note && (
                        <span className="text-[11px] text-slate-400 truncate max-w-md hidden md:inline">
                          "{item.note}"
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 self-end sm:self-center">
                  <Clock size={12} />
                  <span>
                    {new Date(item.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  );
};
