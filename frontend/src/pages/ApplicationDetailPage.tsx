import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Application, DocumentCategory, ReminderStatus } from '../types';
import { StatusPill } from '../components/common/StatusPill';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { TimelineView } from '../components/applications/TimelineView';
import { ChangeStatusModal } from '../components/applications/ChangeStatusModal';
import { AddReminderModal } from '../components/reminders/AddReminderModal';
import { Modal } from '../components/common/Modal';
import {
  Building2,
  Calendar,
  ExternalLink,
  MapPin,
  Clock,
  DollarSign,
  Plus,
  CheckCircle2,
  Trash2,
  Mail,
  Phone,
  Linkedin,
  FileText,
  Download,
  AlertCircle,
  Archive,
  ArrowLeft,
  FileUp,
  History,
  Briefcase,
} from 'lucide-react';

export const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'details' | 'reminders' | 'contacts' | 'documents' | 'audit'>('timeline');

  // Modals state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);

  // New Contact form state
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('Recruiter');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactLinkedIn, setContactLinkedIn] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  // Document upload state
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docCategory, setDocCategory] = useState<DocumentCategory>('RESUME');
  const [docName, setDocName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fetchApplication = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const data = await apiRequest<Application>(`/applications/${id}`);
      setApplication(data);
    } catch (err: any) {
      alert(err.message || 'Failed to load application');
      navigate('/applications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const handleToggleReminder = async (reminderId: string, currentStatus: ReminderStatus) => {
    try {
      const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      await apiRequest(`/reminders/${reminderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      fetchApplication();
    } catch (err: any) {
      alert(err.message || 'Failed to update reminder');
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !id) return;

    try {
      await apiRequest('/contacts', {
        method: 'POST',
        body: JSON.stringify({
          applicationId: id,
          companyId: application?.companyId,
          name: contactName.trim(),
          role: contactRole.trim() || undefined,
          email: contactEmail.trim() || undefined,
          phone: contactPhone.trim() || undefined,
          linkedIn: contactLinkedIn.trim() || undefined,
          notes: contactNotes.trim() || undefined,
        }),
      });

      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setContactLinkedIn('');
      setContactNotes('');
      setIsContactModalOpen(false);
      fetchApplication();
    } catch (err: any) {
      alert(err.message || 'Failed to add contact');
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile || !id) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('applicationId', id);
      formData.append('name', docName.trim() || docFile.name);
      formData.append('documentCategory', docCategory);

      await apiRequest('/documents/upload', {
        method: 'POST',
        body: formData,
      });

      setDocFile(null);
      setDocName('');
      setIsDocumentModalOpen(false);
      fetchApplication();
    } catch (err: any) {
      alert(err.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteApplication = async () => {
    if (!id) return;
    if (confirm(`Permanently delete tracking record for ${application?.company.name} (${application?.jobTitle})?`)) {
      try {
        await apiRequest(`/applications/${id}`, { method: 'DELETE' });
        navigate('/applications');
      } catch (err: any) {
        alert(err.message || 'Failed to delete application');
      }
    }
  };

  if (isLoading || !application) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-32 bg-slate-900 rounded-xl" />
        <div className="h-96 bg-slate-900 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="application-detail-page space-y-6 max-w-6xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/applications')}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Back to Applications</span>
      </button>

      {/* Hero Header Card */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Company & Role info */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xl text-indigo-400 shrink-0 shadow-inner">
              {application.company.name.charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                  {application.company.name}
                </h1>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700">
                  {application.publicId}
                </span>
                <PriorityBadge priority={application.priority} size="sm" />
              </div>

              <div className="text-sm font-medium text-indigo-300 mt-1">
                {application.jobTitle}
              </div>

              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar size={13} />
                  Applied {new Date(application.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                {application.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} />
                    {application.location} ({application.workMode})
                  </span>
                )}
                {application.jobUrl && (
                  <a
                    href={application.jobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline"
                  >
                    <ExternalLink size={13} />
                    Job Posting
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {/* Direct Status Trigger */}
            <button
              onClick={() => setIsStatusModalOpen(true)}
              className="detail-action-button flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-indigo-500 transition-all shadow-sm"
              title="Click to change application status"
            >
              <span className="text-xs text-slate-400">Stage:</span>
              <StatusPill status={application.currentStatus} size="sm" />
            </button>

            <button
              onClick={() => setIsReminderModalOpen(true)}
              className="detail-action-button flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              <Clock size={14} className="text-amber-400" />
              <span>Add Reminder</span>
            </button>

            <button
              onClick={() => setIsContactModalOpen(true)}
              className="detail-action-button flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              <Plus size={14} />
              <span>Contact</span>
            </button>

            <button
              onClick={() => setIsDocumentModalOpen(true)}
              className="detail-action-button flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              <FileUp size={14} />
              <span>Document</span>
            </button>

            <button
              onClick={handleDeleteApplication}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Delete Application"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto custom-scrollbar">
        {[
          { id: 'timeline', label: 'Timeline History', count: application.statusHistory?.length },
          { id: 'details', label: 'Application Details' },
          { id: 'reminders', label: 'Follow-ups & Reminders', count: application.reminders?.length },
          { id: 'contacts', label: 'Contacts', count: application.contacts?.length },
          { id: 'documents', label: 'Attached Documents', count: application.documents?.length },
          { id: 'audit', label: 'Audit Trail' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-mono">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Timeline History */}
      {activeTab === 'timeline' && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Application Timeline</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every event, status progression, and automated signal recorded in chronological order.
              </p>
            </div>
            <button
              onClick={() => setIsStatusModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              + Record Status Change
            </button>
          </div>

          <TimelineView
            history={application.statusHistory || []}
            onRefresh={fetchApplication}
          />
        </div>
      )}

      {/* Tab 2: Overview & Details */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Role & Job Attributes
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Company</span>
                <span className="font-semibold text-slate-200">{application.company.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Role Title</span>
                <span className="font-semibold text-slate-200">{application.jobTitle}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Work Mode</span>
                <span className="font-medium text-slate-200">{application.workMode}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Employment Type</span>
                <span className="font-medium text-slate-200">{application.employmentType}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Source</span>
                <span className="font-medium text-slate-200">{application.source}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Salary Target / Range</span>
                <span className="font-medium text-emerald-400">{application.salary || 'Not specified'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Job Requisition ID</span>
                <span className="font-mono text-slate-300">{application.jobId || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Notes & Context
            </h4>
            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-300 whitespace-pre-wrap leading-relaxed min-h-[140px]">
              {application.notes || 'No custom notes recorded for this application.'}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Follow-ups & Reminders */}
      {activeTab === 'reminders' && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">Reminders & Tasks</h3>
            <button
              onClick={() => setIsReminderModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              + Add Reminder
            </button>
          </div>

          {application.reminders && application.reminders.length > 0 ? (
            <div className="space-y-2">
              {application.reminders.map((rem) => {
                const isCompleted = rem.status === 'COMPLETED';
                const isOverdue = new Date(rem.dueAt) < new Date() && !isCompleted;

                return (
                  <div
                    key={rem.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                      isCompleted
                        ? 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                        : isOverdue
                        ? 'bg-rose-950/20 border-rose-800/60 text-slate-200'
                        : 'bg-slate-900/80 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleReminder(rem.id, rem.status)}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          isCompleted
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'border-slate-700 hover:border-indigo-500 bg-slate-950'
                        }`}
                      >
                        {isCompleted && <CheckCircle2 size={14} />}
                      </button>

                      <div>
                        <div className={`text-xs font-medium ${isCompleted ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                          {rem.title}
                        </div>
                        {rem.description && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{rem.description}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        isOverdue
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        Due: {new Date(rem.dueAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800">
              No follow-ups or reminders pending for this application.
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Contacts */}
      {activeTab === 'contacts' && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">Recruiters & Contacts</h3>
            <button
              onClick={() => setIsContactModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              + Add Contact
            </button>
          </div>

          {application.contacts && application.contacts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {application.contacts.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">{c.name}</h4>
                      <span className="text-[11px] text-indigo-400">{c.role || 'Recruiter'}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    {c.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={13} className="text-slate-500 shrink-0" />
                        <a href={`mailto:${c.email}`} className="hover:text-indigo-300 underline truncate">
                          {c.email}
                        </a>
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-slate-500 shrink-0" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                    {c.linkedIn && (
                      <div className="flex items-center gap-2">
                        <Linkedin size={13} className="text-slate-500 shrink-0" />
                        <a href={c.linkedIn} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
                          LinkedIn Profile
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800">
              No contacts attached. Click "Add Contact" to save recruiter details.
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Attached Documents */}
      {activeTab === 'documents' && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Application Documents</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Submitted resumes, cover letters, and offer letter copies for this application.
              </p>
            </div>
            <button
              onClick={() => setIsDocumentModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              + Upload Document
            </button>
          </div>

          {application.documents && application.documents.length > 0 ? (
            <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
              {application.documents.map((doc) => (
                <div key={doc.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-900/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
                      <FileText size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{doc.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span className="uppercase">{doc.documentCategory}</span>
                        <span>•</span>
                        <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={`http://localhost:5000${doc.fileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800">
              No documents attached yet.
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold text-slate-100">Application Audit Log</h3>
          <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
            {application.auditLogs && application.auditLogs.length > 0 ? (
              application.auditLogs.map((log: any) => (
                <div key={log.id} className="p-3 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <History size={13} className="text-indigo-400" />
                    <span className="font-mono text-[11px] text-slate-300 font-semibold">{log.eventType}</span>
                  </div>
                  <span className="text-slate-500 text-[11px]">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">No audit records found.</div>
            )}
          </div>
        </div>
      )}

      {/* Status Modal */}
      <ChangeStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        applicationId={application.id}
        currentStatus={application.currentStatus}
        companyName={application.company.name}
        jobTitle={application.jobTitle}
        onSuccess={() => {
          setIsStatusModalOpen(false);
          fetchApplication();
        }}
      />

      {/* Reminder Modal */}
      <AddReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        applicationId={application.id}
        defaultTitle={`Follow up on ${application.company.name}`}
        onSuccess={() => {
          setIsReminderModalOpen(false);
          fetchApplication();
        }}
      />

      {/* Contact Modal */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title="Add Recruiter Contact"
        subtitle={`Associate contact with ${application.company.name}`}
      >
        <form onSubmit={handleCreateContact} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Name *</label>
            <input
              type="text"
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Sarah Connor"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Role / Title</label>
              <input
                type="text"
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                placeholder="Recruiter"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="sarah@company.com"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Phone</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 (555) 019-2831"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">LinkedIn URL</label>
              <input
                type="url"
                value={contactLinkedIn}
                onChange={(e) => setContactLinkedIn(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Notes</label>
            <textarea
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              rows={2}
              placeholder="Notes on communication style, referral info..."
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsContactModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs bg-indigo-600 text-white font-medium rounded-lg"
            >
              Save Contact
            </button>
          </div>
        </form>
      </Modal>

      {/* Document Upload Modal */}
      <Modal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        title="Upload Document"
        subtitle="Attach resume, cover letter, or offer letter"
      >
        <form onSubmit={handleUploadDocument} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Document Type</label>
            <select
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value as DocumentCategory)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100"
            >
              <option value="RESUME">Submitted Resume</option>
              <option value="COVER_LETTER">Cover Letter</option>
              <option value="OFFER_LETTER">Offer Letter</option>
              <option value="APPLICATION_PDF">Application PDF</option>
              <option value="ASSESSMENT_SUBMISSION">Assessment Submission</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Document Name (Optional)</label>
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="e.g. Resume_v3_Tailored.pdf"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Choose File (PDF, DOCX, TXT, PNG)</label>
            <input
              type="file"
              required
              onChange={(e) => setDocFile(e.target.files ? e.target.files[0] : null)}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsDocumentModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !docFile}
              className="px-3 py-1.5 text-xs bg-indigo-600 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
