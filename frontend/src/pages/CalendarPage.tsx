import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Reminder, ReminderStatus } from '../types';
import { AddReminderModal } from '../components/reminders/AddReminderModal';
import { EmptyState } from '../components/common/EmptyState';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('PENDING');
  const navigate = useNavigate();

  const fetchReminders = async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest<Reminder[]>(
        `/reminders${filter !== 'ALL' ? `?status=${filter}` : ''}`
      );
      setReminders(res || []);
    } catch (err) {
      console.error('Failed to load reminders', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [filter]);

  const handleToggleStatus = async (id: string, current: ReminderStatus) => {
    try {
      const nextStatus = current === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      await apiRequest(`/reminders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchReminders();
    } catch (err: any) {
      alert(err.message || 'Failed to update reminder');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/reminders/${id}`, { method: 'DELETE' });
      fetchReminders();
    } catch (err: any) {
      alert(err.message || 'Failed to delete reminder');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Follow-ups & Calendar</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track recruiter follow-up deadlines, interview loops, and scheduled tasks.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>Add Reminder</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {(['PENDING', 'ALL', 'COMPLETED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === tab
                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {tab === 'PENDING' ? 'Active / Upcoming' : tab === 'COMPLETED' ? 'Completed' : 'All Reminders'}
          </button>
        ))}
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading reminders...</div>
        ) : reminders.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title="You're all caught up!"
            description="No pending follow-ups. Automated reminders will appear here when applications need attention."
            actionLabel="+ Create Custom Reminder"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          reminders.map((rem) => {
            const isCompleted = rem.status === 'COMPLETED';
            const isOverdue = new Date(rem.dueAt) < new Date() && !isCompleted;

            return (
              <div
                key={rem.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                  isCompleted
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                    : isOverdue
                    ? 'bg-rose-950/20 border-rose-800/60 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <button
                    onClick={() => handleToggleStatus(rem.id, rem.status)}
                    className={`w-5 h-5 mt-0.5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'border-slate-700 hover:border-indigo-500 bg-slate-950'
                    }`}
                  >
                    {isCompleted && <CheckCircle2 size={13} />}
                  </button>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold ${isCompleted ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                        {rem.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {rem.type.replace('_', ' ')}
                      </span>
                      {isOverdue && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-medium flex items-center gap-1">
                          <AlertCircle size={10} /> Overdue
                        </span>
                      )}
                    </div>

                    {rem.description && (
                      <p className="text-xs text-slate-400 mt-1">{rem.description}</p>
                    )}

                    {rem.application && (
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <span className="text-slate-400 font-medium">
                          {rem.application.company.name} ({rem.application.jobTitle})
                        </span>
                        <button
                          onClick={() => navigate(`/applications/${rem.application!.id}`)}
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 underline text-[11px]"
                        >
                          <span>View App</span>
                          <ExternalLink size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                    <Clock size={13} />
                    <span>{new Date(rem.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>

                  <button
                    onClick={() => handleDelete(rem.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Delete Reminder"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AddReminderModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchReminders();
        }}
      />
    </div>
  );
};
