import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { apiRequest } from '../../api/client';
import {
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { StatusPill } from '../common/StatusPill';

const schema = z.object({
  company: z.string().min(1, 'Company name is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  appliedAt: z.string().min(1, 'Application date is required'),
  currentStatus: z.enum([
    'SAVED',
    'APPLIED',
    'VIEWED',
    'ASSESSMENT',
    'INTERVIEW',
    'OFFER',
    'ACCEPTED',
    'REJECTED',
    'WITHDRAWN',
    'CLOSED',
  ]),
  jobUrl: z.string().optional(),
  jobId: z.string().optional(),
  location: z.string().optional(),
  workMode: z.enum(['REMOTE', 'HYBRID', 'ONSITE']),
  employmentType: z.enum([
    'FULL_TIME',
    'PART_TIME',
    'CONTRACT',
    'INTERNSHIP',
    'FREELANCE',
    'TEMPORARY',
  ]),
  source: z.string(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  salary: z.string().optional(),
  notes: z.string().optional(),
  scheduleFollowUp: z.boolean(),
  customFollowUpDays: z.number().int().min(1).max(90),
  recruiterName: z.string().optional(),
  recruiterEmail: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AddApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddApplicationModal: React.FC<AddApplicationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isParsingUrl, setIsParsingUrl] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company: '',
      jobTitle: '',
      appliedAt: new Date().toISOString().split('T')[0],
      currentStatus: 'APPLIED',
      jobUrl: '',
      jobId: '',
      location: '',
      workMode: 'HYBRID',
      employmentType: 'FULL_TIME',
      source: 'LINKEDIN',
      priority: 'MEDIUM',
      salary: '',
      notes: '',
      scheduleFollowUp: true,
      customFollowUpDays: 7,
      recruiterName: '',
      recruiterEmail: '',
    },
  });

  const watchedUrl = watch('jobUrl');
  const watchedCompany = watch('company');
  const watchedTitle = watch('jobTitle');
  const watchedJobId = watch('jobId');

  // URL Intelligence Autofill
  const handleUrlPaste = async (e: React.ClipboardEvent<HTMLInputElement> | React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = 'clipboardData' in e ? e.clipboardData.getData('text') : (e.target as HTMLInputElement).value;
    if (!rawVal || !rawVal.startsWith('http')) return;

    try {
      setIsParsingUrl(true);
      const res = await apiRequest('/applications/parse-url', {
        method: 'POST',
        body: JSON.stringify({ url: rawVal }),
      });

      if (res) {
        if (res.company && !watchedCompany) setValue('company', res.company);
        if (res.jobTitle && !watchedTitle) setValue('jobTitle', res.jobTitle);
        if (res.jobId && !watchedJobId) setValue('jobId', res.jobId);
        if (res.source) setValue('source', res.source);
      }
    } catch {
      // ignore
    } finally {
      setIsParsingUrl(false);
    }
  };

  // Real-time Duplicate Detection
  useEffect(() => {
    if (!watchedCompany || watchedCompany.length < 2) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest('/applications/check-duplicate', {
          method: 'POST',
          body: JSON.stringify({
            company: watchedCompany,
            jobTitle: watchedTitle || undefined,
            jobId: watchedJobId || undefined,
            jobUrl: watchedUrl || undefined,
          }),
        });

        if (res && res.hasDuplicate) {
          setDuplicateWarning(res.existingApplication);
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        setDuplicateWarning(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [watchedCompany, watchedTitle, watchedJobId, watchedUrl]);

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      await apiRequest('/applications', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          jobUrl: values.jobUrl || null,
          jobId: values.jobId || null,
          location: values.location || null,
          salary: values.salary || null,
          notes: values.notes || null,
        }),
      });

      reset();
      setDuplicateWarning(null);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to create application');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        reset();
        setDuplicateWarning(null);
        onClose();
      }}
      title="Add Job Application"
      subtitle="Track your submission and keep your timeline up to date"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Job URL with Intelligence Autofill */}
        <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Sparkles size={13} className="text-indigo-400" />
              Job Posting URL (Optional Intelligence Autofill)
            </label>
            {isParsingUrl && (
              <span className="text-[11px] text-indigo-400 animate-pulse">
                Extracting metadata...
              </span>
            )}
          </div>
          <input
            type="url"
            {...register('jobUrl')}
            onPaste={handleUrlPaste}
            placeholder="Paste LinkedIn, Greenhouse, Lever, or career page URL..."
            className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Duplicate Warning Banner */}
        {duplicateWarning && (
          <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-lg flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-amber-200">
              <p className="font-semibold text-amber-100">You may already be tracking this application.</p>
              <div className="flex items-center gap-2 mt-1">
                <span>
                  <strong>{duplicateWarning.companyName}</strong> — {duplicateWarning.jobTitle}
                </span>
                <StatusPill status={duplicateWarning.currentStatus} size="sm" />
              </div>
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/applications/${duplicateWarning.id}`);
                  }}
                  className="flex items-center gap-1 font-medium text-indigo-300 hover:text-indigo-200 underline"
                >
                  <ExternalLink size={12} />
                  View Existing Application
                </button>
                <span className="text-amber-400/80 text-[11px]">(Or continue creating duplicate below)</span>
              </div>
            </div>
          </div>
        )}

        {/* Core Minimal Required Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Company <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              {...register('company')}
              placeholder="e.g. Microsoft"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {errors.company && (
              <p className="text-[11px] text-rose-400">{errors.company.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Job Title / Role <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              {...register('jobTitle')}
              placeholder="e.g. Senior Software Engineer"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {errors.jobTitle && (
              <p className="text-[11px] text-rose-400">{errors.jobTitle.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Date Applied <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              {...register('appliedAt')}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            {errors.appliedAt && (
              <p className="text-[11px] text-rose-400">{errors.appliedAt.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Initial Status</label>
            <select
              {...register('currentStatus')}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="APPLIED">Applied (Submitted)</option>
              <option value="SAVED">Saved (Not Yet Applied)</option>
              <option value="ASSESSMENT">Assessment</option>
              <option value="INTERVIEW">Interview</option>
            </select>
          </div>
        </div>

        {/* Smart Follow-up Toggle */}
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between">
          <div>
            <label className="text-xs font-medium text-slate-200 block">
              Schedule Automated Follow-up Reminder
            </label>
            <span className="text-[11px] text-slate-400">
              Creates a follow-up reminder if no response is detected.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              {...register('customFollowUpDays', { valueAsNumber: true })}
              className="px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200"
            >
              <option value={3}>in 3 days</option>
              <option value={5}>in 5 days</option>
              <option value={7}>in 7 days</option>
              <option value={14}>in 14 days</option>
            </select>
            <input
              type="checkbox"
              {...register('scheduleFollowUp')}
              className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
            />
          </div>
        </div>

        {/* Expandable Optional Fields */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium py-1"
          >
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showAdvanced ? 'Hide Additional Details' : 'Add Optional Details (Location, Source, Recruiter, Salary)'}
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-2 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Source</label>
                  <select
                    {...register('source')}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100"
                  >
                    <option value="LINKEDIN">LinkedIn</option>
                    <option value="COMPANY_WEBSITE">Company Website</option>
                    <option value="INDEED">Indeed</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="CAMPUS_PLACEMENT">Campus Placement</option>
                    <option value="RECRUITER">Recruiter</option>
                    <option value="JOB_BOARD">Job Board</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Work Mode</label>
                  <select
                    {...register('workMode')}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100"
                  >
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ONSITE">Onsite</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Priority</label>
                  <select
                    {...register('priority')}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Location</label>
                  <input
                    type="text"
                    {...register('location')}
                    placeholder="e.g. San Francisco, CA"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Job Requisition ID</label>
                  <input
                    type="text"
                    {...register('jobId')}
                    placeholder="e.g. REQ-94820"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Salary / Range</label>
                  <input
                    type="text"
                    {...register('salary')}
                    placeholder="e.g. $140k - $160k"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Recruiter Contact Name</label>
                  <input
                    type="text"
                    {...register('recruiterName')}
                    placeholder="e.g. Sarah Connor"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Recruiter Email</label>
                  <input
                    type="email"
                    {...register('recruiterEmail')}
                    placeholder="e.g. sarah@company.com"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Notes & Context</label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  placeholder="Referral notes, compensation target, interview hints..."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
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
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Plus size={14} />
            {isSubmitting ? 'Tracking...' : 'Track Application'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
