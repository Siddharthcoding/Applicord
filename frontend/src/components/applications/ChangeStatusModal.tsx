import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ApplicationStatus, HistorySource } from '../../types';
import { apiRequest } from '../../api/client';
import { StatusPill } from '../common/StatusPill';

interface ChangeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  currentStatus: ApplicationStatus;
  companyName: string;
  jobTitle: string;
  onSuccess?: () => void;
}

const ALL_STATUSES: { status: ApplicationStatus; desc: string }[] = [
  { status: 'SAVED', desc: 'Bookmarked to apply later' },
  { status: 'APPLIED', desc: 'Application officially submitted' },
  { status: 'VIEWED', desc: 'Application opened/viewed by recruiter' },
  { status: 'ASSESSMENT', desc: 'Online test or take-home challenge' },
  { status: 'INTERVIEW', desc: 'Technical loop, phone screen, or behavioral' },
  { status: 'OFFER', desc: 'Job offer letter extended' },
  { status: 'ACCEPTED', desc: 'Offer signed and accepted' },
  { status: 'REJECTED', desc: 'Company decided not to move forward' },
  { status: 'WITHDRAWN', desc: 'You voluntarily withdrew candidacy' },
  { status: 'CLOSED', desc: 'Role canceled or requisition closed' },
];

export const ChangeStatusModal: React.FC<ChangeStatusModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  currentStatus,
  companyName,
  jobTitle,
  onSuccess,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus>(currentStatus);
  const [source, setSource] = useState<HistorySource>('MANUAL');
  const [note, setNote] = useState('');
  const [scheduleFollowUp, setScheduleFollowUp] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await apiRequest(`/applications/${applicationId}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status: selectedStatus,
          source,
          note: note.trim() || undefined,
          scheduleFollowUp,
        }),
      });

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Application Status"
      subtitle={`${companyName} — ${jobTitle}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-2 block">
            Select New Stage
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_STATUSES.map((item) => {
              const isSelected = selectedStatus === item.status;
              const isCurrent = currentStatus === item.status;

              return (
                <button
                  type="button"
                  key={item.status}
                  onClick={() => setSelectedStatus(item.status)}
                  className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <StatusPill status={item.status} size="sm" />
                    {isCurrent && (
                      <span className="text-[10px] text-slate-500 font-medium">Current</span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 line-clamp-1">{item.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Event Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as HistorySource)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none"
            >
              <option value="MANUAL">Manual User Action</option>
              <option value="EMAIL">Received via Email</option>
              <option value="BROWSER_EXTENSION">Browser Extension</option>
              <option value="IMPORT">Data Import</option>
              <option value="SYSTEM">System Trigger</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-lg self-end">
            <div>
              <span className="text-xs font-medium text-slate-200 block">Smart Follow-up</span>
              <span className="text-[10px] text-slate-400">Suggest follow-up reminder</span>
            </div>
            <input
              type="checkbox"
              checked={scheduleFollowUp}
              onChange={(e) => setScheduleFollowUp(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-300">Timeline Note (Optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Scheduled 45m screen with Engineering Director"
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Updating...' : 'Update Status & Timeline'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
