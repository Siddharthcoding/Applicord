import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { Modal } from '../components/common/Modal';
import {
  Sliders,
  Shield,
  Bell,
  Trash2,
  CheckCircle2,
  Save,
  AlertTriangle,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, updateSettings, logout } = useAuth();
  const settings = user?.settings;

  const [emailDetection, setEmailDetection] = useState(settings?.emailDetection ?? true);
  const [autoStatusSuggestions, setAutoStatusSuggestions] = useState(settings?.autoStatusSuggestions ?? true);
  const [autoRejectionUpdates, setAutoRejectionUpdates] = useState(settings?.autoRejectionUpdates ?? false);
  const [autoInterviewUpdates, setAutoInterviewUpdates] = useState(settings?.autoInterviewUpdates ?? true);
  const [autoFollowUpReminders, setAutoFollowUpReminders] = useState(settings?.autoFollowUpReminders ?? true);
  const [followUpDays, setFollowUpDays] = useState(settings?.followUpDays ?? 7);
  const [highConfidenceAutoUpdate, setHighConfidenceAutoUpdate] = useState(settings?.highConfidenceAutoUpdate ?? false);
  const [emailNotifications, setEmailNotifications] = useState(settings?.emailNotifications ?? false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updateSettings({
        emailDetection,
        autoStatusSuggestions,
        autoRejectionUpdates,
        autoInterviewUpdates,
        autoFollowUpReminders,
        followUpDays: Number(followUpDays),
        highConfidenceAutoUpdate,
        emailNotifications,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE') return;
    try {
      await apiRequest('/auth/account', { method: 'DELETE' });
      logout();
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Settings & Automation Rules</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure how aggressive automation should be, notification preferences, and account controls.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Automation Rules */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-400">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Automation & Signal Detection</h3>
              <p className="text-xs text-slate-400">
                You control whether automated events update silently or require manual review.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-800/80 space-y-3 pt-2">
            {/* Email Detection */}
            <div className="flex items-center justify-between pt-3">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Email Signal Detection</span>
                <span className="text-[11px] text-slate-400">
                  Scan connected inboxes for interview, assessment, and rejection signals.
                </span>
              </div>
              <input
                type="checkbox"
                checked={emailDetection}
                onChange={(e) => setEmailDetection(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
              />
            </div>

            {/* Status Suggestions */}
            <div className="flex items-center justify-between pt-3">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Suggested Status Updates</span>
                <span className="text-[11px] text-slate-400">
                  Generate explainable review cards in the Automation Hub for detected changes.
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoStatusSuggestions}
                onChange={(e) => setAutoStatusSuggestions(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
              />
            </div>

            {/* Auto Interview Updates */}
            <div className="flex items-center justify-between pt-3">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Automatic Interview Status Updates</span>
                <span className="text-[11px] text-slate-400">
                  Automatically move application to Interview stage upon high-confidence email signal.
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoInterviewUpdates}
                onChange={(e) => setAutoInterviewUpdates(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
              />
            </div>

            {/* Auto Rejection Updates */}
            <div className="flex items-center justify-between pt-3">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Automatic Rejection Updates</span>
                <span className="text-[11px] text-slate-400">
                  Silently move application to Rejected without asking (Disabled by default to avoid false positives).
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoRejectionUpdates}
                onChange={(e) => setAutoRejectionUpdates(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
              />
            </div>

            {/* High Confidence Auto-Update */}
            <div className="flex items-center justify-between pt-3">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Auto-Apply High Confidence Signals (90%+)</span>
                <span className="text-[11px] text-slate-400">
                  Skip confirmation for highest-confidence matching signals while keeping audit log.
                </span>
              </div>
              <input
                type="checkbox"
                checked={highConfidenceAutoUpdate}
                onChange={(e) => setHighConfidenceAutoUpdate(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Smart Follow-ups */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-400">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Smart Follow-up Automation</h3>
              <p className="text-xs text-slate-400">
                Configure default cadence for automated follow-up reminders.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-800/80 space-y-3 pt-2">
            <div className="flex items-center justify-between pt-3">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Create Follow-up Reminders</span>
                <span className="text-[11px] text-slate-400">
                  Automatically schedule follow-up reminders when applications are submitted or interviewed.
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoFollowUpReminders}
                onChange={(e) => setAutoFollowUpReminders(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Default Follow-up Interval</span>
                <span className="text-[11px] text-slate-400">Number of days to wait before reminding to follow up.</span>
              </div>
              <select
                value={followUpDays}
                onChange={(e) => setFollowUpDays(Number(e.target.value))}
                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
              >
                <option value={3}>3 days</option>
                <option value={5}>5 days</option>
                <option value={7}>7 days (Recommended)</option>
                <option value={10}>10 days</option>
                <option value={14}>14 days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 size={14} />
              Settings saved successfully!
            </span>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
          >
            <Save size={15} />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* Danger Zone: Account Deletion */}
      <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-900/60 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-rose-300">Delete Account & Career Data</h3>
            <p className="text-xs text-rose-300/70 mt-1 max-w-xl">
              Permanently delete your account, submitted applications, timeline histories, uploaded documents, and recruiter contacts. This action is irreversible.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-4 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-lg text-xs font-semibold transition-colors shrink-0"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Account Deletion"
        subtitle="This action cannot be undone"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-rose-950/40 border border-rose-800/80 rounded-xl text-xs text-rose-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-100">
              <AlertTriangle size={16} />
              <span>Warning: Irreversible Data Deletion</span>
            </div>
            <p>
              Deleting your account will cascade and permanently purge all applications, timelines, documents, and contacts from Applicord.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Type <strong className="text-rose-400 font-mono">DELETE</strong> to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirmationText !== 'DELETE'}
              className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold rounded-lg shadow-sm"
            >
              Permanently Delete Account
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
