import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ApplicationStatus, ApplicationStatusHistory } from '../../types';
import { apiRequest } from '../../api/client';
import { StatusPill } from '../common/StatusPill';
import { AlertCircle } from 'lucide-react';

interface CorrectStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ApplicationStatusHistory | null;
  onSuccess?: () => void;
}

export const CorrectStatusModal: React.FC<CorrectStatusModalProps> = ({
  isOpen,
  onClose,
  event,
  onSuccess,
}) => {
  const [correctStatus, setCorrectStatus] = useState<ApplicationStatus>(event?.status || 'APPLIED');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!event) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please provide a reason for the correction.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiRequest('/applications/correct-status', {
        method: 'POST',
        body: JSON.stringify({
          statusHistoryId: event.id,
          correctStatus,
          reason: reason.trim(),
        }),
      });

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to correct status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Correct Automated Timeline Event"
      subtitle="Manual override preserving audit trail and history integrity"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-start gap-2.5">
          <AlertCircle size={16} className="text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-slate-200">Original Event:</span>{' '}
            <StatusPill status={event.status} size="sm" /> on{' '}
            {new Date(event.timestamp).toLocaleDateString()}
            {event.metadata?.reason && (
              <p className="text-[11px] text-slate-400 mt-1">
                Reason: <em>"{event.metadata.reason}"</em>
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-300">
            What should this stage actually be?
          </label>
          <select
            value={correctStatus}
            onChange={(e) => setCorrectStatus(e.target.value as ApplicationStatus)}
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none"
          >
            <option value="SAVED">Saved</option>
            <option value="APPLIED">Applied</option>
            <option value="VIEWED">Viewed</option>
            <option value="ASSESSMENT">Assessment</option>
            <option value="INTERVIEW">Interview</option>
            <option value="OFFER">Offer</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="WITHDRAWN">Withdrawn</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-300">
            Reason for Correction <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Email was a marketing update, not a technical interview"
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
            {isSubmitting ? 'Saving...' : 'Apply Correction'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
