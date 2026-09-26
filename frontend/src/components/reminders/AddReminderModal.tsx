import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ReminderType } from '../../types';
import { apiRequest } from '../../api/client';

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId?: string;
  defaultTitle?: string;
  onSuccess?: () => void;
}

export const AddReminderModal: React.FC<AddReminderModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  defaultTitle = '',
  onSuccess,
}) => {
  const [title, setTitle] = useState(defaultTitle);
  const [type, setType] = useState<ReminderType>('FOLLOW_UP');
  const [dueAt, setDueAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueAt) return;

    try {
      setIsSubmitting(true);
      await apiRequest('/reminders', {
        method: 'POST',
        body: JSON.stringify({
          applicationId: applicationId || undefined,
          type,
          title: title.trim(),
          description: description.trim() || undefined,
          dueAt: new Date(dueAt).toISOString(),
        }),
      });

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to create reminder');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Reminder / Follow-up"
      subtitle="Stay on top of recruiter correspondence and interview prep"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-300">
            Reminder Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Follow up with hiring manager on feedback"
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ReminderType)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none"
            >
              <option value="FOLLOW_UP">Follow-up</option>
              <option value="STATUS_CHECK">Status Check</option>
              <option value="INTERVIEW_PREP">Interview Preparation</option>
              <option value="CUSTOM">Custom Task</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Due Date <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              required
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-300">Notes / Details</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional context or talking points..."
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 resize-none focus:outline-none"
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
            {isSubmitting ? 'Saving...' : 'Set Reminder'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
