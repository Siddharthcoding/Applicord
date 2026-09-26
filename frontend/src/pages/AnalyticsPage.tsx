import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { DetailedAnalytics } from '../types';
import { Skeleton } from '../components/common/Skeleton';
import {
  TrendingUp,
  Percent,
  Clock,
  Briefcase,
  Layers,
  Sparkles,
  BarChart3,
  Calendar,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<DetailedAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const res = await apiRequest<DetailedAnalytics>('/analytics/detailed');
        setData(res);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
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
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
        No application analytics available yet. Track applications to see response metrics.
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Application Analytics</h1>
        <p className="text-xs text-slate-400 mt-1">
          Historical conversion rates, response timelines, and source performance calculated from your timeline audit records.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Response Rate */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Response Rate</span>
            <div className="p-2 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-800/40">
              <Percent size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-blue-400">{data.responseRate}%</div>
            <span className="text-[11px] text-slate-500 font-medium">Progressed past submission</span>
          </div>
        </div>

        {/* Interview Rate */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Interview Rate</span>
            <div className="p-2 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-800/40">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-indigo-400">{data.interviewRate}%</div>
            <span className="text-[11px] text-slate-500 font-medium">Reached interview loop</span>
          </div>
        </div>

        {/* Avg Days to First Response */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Avg Time to Response</span>
            <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/40">
              <Clock size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-amber-300">{data.avgDaysToFirstResponse} days</div>
            <span className="text-[11px] text-slate-500 font-medium">Applied to first recruiter event</span>
          </div>
        </div>

        {/* Avg Days to Rejection */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Avg Time to Decision</span>
            <div className="p-2 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-800/40">
              <Calendar size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-200">{data.avgDaysToRejection} days</div>
            <span className="text-[11px] text-slate-500 font-medium">Applied to final outcome</span>
          </div>
        </div>
      </div>

      {/* Funnel & Conversion Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel Visualization */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 lg:col-span-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Application Funnel</h3>

          <div className="space-y-4 pt-2">
            {data.statusFunnel.map((step, idx) => {
              const max = data.total || 1;
              const pct = Math.round((step.count / max) * 100);

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">{step.stage}</span>
                    <span className="text-slate-400 font-mono">{step.count} ({pct}%)</span>
                  </div>
                  <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Velocity Trend (Weekly Volume) */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 lg:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Weekly Application Velocity</h3>

          {data.weeklyTrend.length > 0 ? (
            <div className="flex items-end gap-2 h-44 pt-6 px-2">
              {data.weeklyTrend.map((item, idx) => {
                const maxCount = Math.max(...data.weeklyTrend.map((w) => w.count), 1);
                const heightPct = Math.round((item.count / maxCount) * 100);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[10px] text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.count}
                    </span>
                    <div
                      className="w-full bg-indigo-600/80 hover:bg-indigo-500 rounded-t-md transition-all duration-300 min-h-[4px]"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] text-slate-500 truncate w-full text-center">
                      {item.week.split('-')[1]}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-slate-500">
              No weekly trend data available
            </div>
          )}
        </div>
      </div>

      {/* Source Performance Matrix */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Performance by Application Source</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="pb-3">Source</th>
                <th className="pb-3">Total Applied</th>
                <th className="pb-3">Responded</th>
                <th className="pb-3">Interviews</th>
                <th className="pb-3">Offers</th>
                <th className="pb-3">Response Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data.sourceBreakdown.map((src) => (
                <tr key={src.source} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 font-semibold text-slate-200">{src.source}</td>
                  <td className="py-3 font-mono text-slate-300">{src.total}</td>
                  <td className="py-3 font-mono text-slate-300">{src.responded}</td>
                  <td className="py-3 font-mono text-indigo-300 font-bold">{src.interviews}</td>
                  <td className="py-3 font-mono text-emerald-300 font-bold">{src.offers}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-medium border border-indigo-800/50">
                      {src.responseRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
