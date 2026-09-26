import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Application, ApplicationStatus } from '../types';
import { StatusPill } from '../components/common/StatusPill';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { ChangeStatusModal } from '../components/applications/ChangeStatusModal';
import {
  Building2,
  Calendar,
  Clock,
  Plus,
  ArrowRight,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';

const KANBAN_COLUMNS: { status: ApplicationStatus; title: string; color: string }[] = [
  { status: 'SAVED', title: 'Saved', color: 'border-slate-700/60' },
  { status: 'APPLIED', title: 'Applied', color: 'border-blue-700/60' },
  { status: 'VIEWED', title: 'Viewed', color: 'border-purple-700/60' },
  { status: 'ASSESSMENT', title: 'Assessment', color: 'border-amber-700/60' },
  { status: 'INTERVIEW', title: 'Interview', color: 'border-indigo-700/60' },
  { status: 'OFFER', title: 'Offer', color: 'border-emerald-700/60' },
  { status: 'REJECTED', title: 'Rejected', color: 'border-rose-700/60' },
];

export const KanbanPage: React.FC = () => {
  const [board, setBoard] = useState<Record<ApplicationStatus, Application[]>>({} as any);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const navigate = useNavigate();

  const fetchBoard = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest<Record<ApplicationStatus, Application[]>>('/applications/kanban');
      setBoard(data);
    } catch (err) {
      console.error('Failed to load kanban', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, []);

  const handleQuickMove = async (app: Application, targetStatus: ApplicationStatus) => {
    // Optimistic UI Update
    const prevBoard = { ...board };
    const fromCol = app.currentStatus;
    
    setBoard({
      ...board,
      [fromCol]: (board[fromCol] || []).filter((a) => a.id !== app.id),
      [targetStatus]: [...(board[targetStatus] || []), { ...app, currentStatus: targetStatus }],
    });

    try {
      await apiRequest(`/applications/${app.id}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status: targetStatus,
          source: 'MANUAL',
          note: `Moved to ${targetStatus} via Kanban board`,
        }),
      });
      fetchBoard();
    } catch (err: any) {
      alert(err.message || 'Failed to move card');
      setBoard(prevBoard);
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-6 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-72 shrink-0 h-[70vh] bg-slate-900/60 rounded-xl border border-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Kanban Board</h1>
          <p className="text-xs text-slate-400 mt-1">
            Visual application pipeline. Move applications across stages to trigger status events.
          </p>
        </div>
      </div>

      {/* Kanban Board Container (Horizontally scrollable) */}
      <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar items-start min-h-[75vh]">
        {KANBAN_COLUMNS.map((col) => {
          const cards = board[col.status] || [];

          return (
            <div
              key={col.status}
              className={`w-80 shrink-0 rounded-2xl bg-slate-900/50 border ${col.color} p-3.5 flex flex-col max-h-[80vh] shadow-sm`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <StatusPill status={col.status} size="sm" />
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {cards.length}
                </span>
              </div>

              {/* Cards list */}
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {cards.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-600 border border-dashed border-slate-800/80 rounded-xl">
                    No applications in {col.title}
                  </div>
                ) : (
                  cards.map((app) => {
                    const nextReminder = app.reminders && app.reminders.length > 0 ? app.reminders[0] : null;

                    return (
                      <div
                        key={app.id}
                        onClick={() => navigate(`/applications/${app.id}`)}
                        className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-indigo-500/80 cursor-pointer transition-all shadow-sm group space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-400 shrink-0">
                              {app.company.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                                {app.company.name}
                              </h4>
                              <div className="text-[11px] text-slate-400 truncate max-w-[170px]">
                                {app.jobTitle}
                              </div>
                            </div>
                          </div>
                          <PriorityBadge priority={app.priority} size="sm" />
                        </div>

                        {/* Card metadata */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                          <div className="flex items-center gap-1 text-slate-500">
                            <Calendar size={11} />
                            <span>{new Date(app.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          </div>

                          {nextReminder && (
                            <div className="flex items-center gap-1 text-amber-300 font-medium">
                              <Clock size={11} />
                              <span>{new Date(nextReminder.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            </div>
                          )}
                        </div>

                        {/* Quick stage transition button */}
                        <div
                          className="pt-2 flex items-center justify-between border-t border-slate-900/60"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setSelectedApp(app)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                          >
                            <span>Move stage</span>
                            <ArrowRight size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Change Status Modal */}
      {selectedApp && (
        <ChangeStatusModal
          isOpen={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          applicationId={selectedApp.id}
          currentStatus={selectedApp.currentStatus}
          companyName={selectedApp.company.name}
          jobTitle={selectedApp.jobTitle}
          onSuccess={() => {
            setSelectedApp(null);
            fetchBoard();
          }}
        />
      )}
    </div>
  );
};
