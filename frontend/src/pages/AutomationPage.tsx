import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { AutomationSuggestion, ApplicationStatus } from '../types';
import { StatusPill } from '../components/common/StatusPill';
import { EmptyState } from '../components/common/EmptyState';

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'SAVED', label: 'Saved' },
  { value: 'APPLIED', label: 'Applied' },
  { value: 'VIEWED', label: 'Viewed' },
  { value: 'ASSESSMENT', label: 'Assessment' },
  { value: 'INTERVIEW', label: 'Interview' },
  { value: 'OFFER', label: 'Offer' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
  { value: 'CLOSED', label: 'Closed' },
];

type SuggestionDraft = {
  company: string; role: string; status: string; appliedAt: string; jobUrl: string; jobId: string;
  location: string; source: string; workMode: string; priority: string; salary: string;
  recruiterName: string; recruiterEmail: string; notes: string; scheduleFollowUp: boolean; customFollowUpDays: number;
};
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Mail,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Trash2,
  Check,
  Building,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  X,
} from 'lucide-react';

interface EmailIntegrationItem {
  id: string;
  provider: string;
  providerAccountId: string;
  syncStatus: string;
  isEnabled: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  _count?: {
    processedEmails: number;
  };
}

const cleanEmailDisplay = (text?: string | null): string => {
  if (!text) return '';
  return text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&ldquo;/gi, '"')
    .replace(/&rdquo;/gi, '"')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
};

export const AutomationPage: React.FC = () => {
  const [suggestions, setSuggestions] = useState<AutomationSuggestion[]>([]);
  const [integrations, setIntegrations] = useState<EmailIntegrationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [syncingIntegrationId, setSyncingIntegrationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ALL'>('PENDING');
  const [acceptedToast, setAcceptedToast] = useState<{ company: string; appId: string } | null>(null);
  const [expandedEmailIds, setExpandedEmailIds] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<SuggestionDraft>({
    company: '', role: '', status: '', appliedAt: new Date().toISOString().slice(0, 10), jobUrl: '', jobId: '',
    location: '', source: 'LINKEDIN', workMode: 'HYBRID', priority: 'MEDIUM', salary: '',
    recruiterName: '', recruiterEmail: '', notes: '', scheduleFollowUp: true, customFollowUpDays: 7,
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const navigate = useNavigate();

  const toggleEmailExpanded = (id: string) => {
    setExpandedEmailIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const gmailConnected = searchParams.get('gmail_connected') === 'true';
  const oauthError = searchParams.get('error');

  const fetchIntegrations = async () => {
    try {
      const res = await apiRequest<EmailIntegrationItem[]>('/email/integrations');
      setIntegrations(res || []);
    } catch (err) {
      console.error('Failed to load integrations', err);
    }
  };

  const fetchSuggestions = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const queryParam = activeTab === 'ALL' ? '' : `?status=${activeTab}`;
      const res = await apiRequest<AutomationSuggestion[]>(`/email/suggestions${queryParam}`);
      setSuggestions(res || []);
    } catch (err) {
      console.error('Failed to load suggestions', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
    fetchIntegrations();

    const handleUpdate = () => {
      fetchSuggestions(true);
      fetchIntegrations();
    };

    window.addEventListener('applylog_suggestions_updated', handleUpdate);

    // Only poll when actively syncing or immediately after a fresh OAuth redirect.
    // During idle browsing, stop polling — firing requests every few seconds
    // wastes Neon connection quota and slows every other page sharing the same DB pool.
    const isActivelySyncing = syncingIntegrationId !== null || isSyncingAll || gmailConnected;
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActivelySyncing) {
      const pollInterval = gmailConnected ? 3500 : 5000;
      interval = setInterval(() => {
        fetchSuggestions(true);
        fetchIntegrations();
      }, pollInterval);
    }

    return () => {
      window.removeEventListener('applylog_suggestions_updated', handleUpdate);
      if (interval !== null) clearInterval(interval);
    };
  }, [activeTab, syncingIntegrationId, isSyncingAll, gmailConnected]);

  const handleConnectGmail = async () => {
    try {
      setIsConnectingGoogle(true);
      const res = await apiRequest<{ url: string }>('/email/google/auth-url');
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initialize Google authentication. Please check server GOOGLE_CLIENT_ID configuration.');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleSyncIntegration = async (integrationId: string) => {
    try {
      setSyncingIntegrationId(integrationId);
      const res = await apiRequest<{ syncedCount: number }>(`/email/integrations/${integrationId}/sync`, {
        method: 'POST',
      });
      alert(`Sync completed! Scanned and processed ${res?.syncedCount ?? 0} application emails.`);
      fetchIntegrations();
      fetchSuggestions();
    } catch (err: any) {
      alert(err.message || 'Failed to sync Gmail inbox');
    } finally {
      setSyncingIntegrationId(null);
    }
  };

  const handleDisconnectIntegration = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this email integration?')) return;
    try {
      await apiRequest(`/email/integrations/${integrationId}`, {
        method: 'DELETE',
      });
      fetchIntegrations();
    } catch (err: any) {
      alert(err.message || 'Failed to disconnect integration');
    }
  };

  const handleSyncAll = async () => {
    try {
      setIsSyncingAll(true);
      const res = await apiRequest<any[]>('/email/integrations/sync-all', {
        method: 'POST',
      });
      alert(`Synchronized all accounts! Checked ${res?.length || 0} inboxes.`);
      fetchIntegrations();
      fetchSuggestions();
    } catch (err: any) {
      alert(err.message || 'Failed to sync all accounts');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const openEditPanel = (sug: AutomationSuggestion) => {
    const application = sug.application;
    setEditDraft({
      company: application?.company?.name || sug.payload.detectedCompany || '',
      role: application?.jobTitle || sug.payload.detectedRole || '',
      status: application?.currentStatus || sug.payload.targetStatus || 'APPLIED',
      appliedAt: application?.appliedAt ? new Date(application.appliedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      jobUrl: application?.jobUrl || '', jobId: application?.jobId || '', location: application?.location || '',
      source: application?.source || 'LINKEDIN', workMode: application?.workMode || 'HYBRID', priority: application?.priority || 'MEDIUM',
      salary: application?.salary || '', recruiterName: '', recruiterEmail: '', notes: application?.notes || '', scheduleFollowUp: true, customFollowUpDays: 7,
    });
    setEditingId(sug.id);
  };

  const closeEditPanel = () => {
    setEditingId(null);
  };

  const handleResolve = async (
    id: string,
    action: 'ACCEPT' | 'REJECT',
    targetApplicationId?: string,
    overrides?: Partial<SuggestionDraft>
  ) => {
    // Snapshot current state for rollback on error
    const previousSuggestions = [...suggestions];

    // Optimistically remove/update from UI immediately
    setEditingId(null);
    setSuggestions((prev) => {
      if (activeTab === 'ALL') {
        return prev.map((s) => (s.id === id ? { ...s, status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED' } : s));
      }
      return prev.filter((s) => s.id !== id);
    });

    try {
      const res = await apiRequest<any>(`/email/suggestions/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action, targetApplicationId, overrides }),
      });

      if (action === 'ACCEPT' && res?.applicationId) {
        const companyName = res.application?.company?.name || overrides?.company || 'Company';
        setAcceptedToast({ company: companyName, appId: res.applicationId });
        setTimeout(() => setAcceptedToast(null), 8000);
      }

      window.dispatchEvent(new CustomEvent('applylog_application_created'));
      window.dispatchEvent(new CustomEvent('applylog_suggestions_updated'));

      fetchSuggestions(true);
    } catch (err: any) {
      // Revert optimistic update on error
      setSuggestions(previousSuggestions);
      alert(err.message || 'Failed to resolve suggestion');
    }
  };

  const gmailIntegrations = integrations.filter((i) => i.provider === 'GMAIL');

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Automation & Suggestions Center</h1>
            <span className="automation-first-badge px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 text-xs font-semibold border border-amber-800">
              <Sparkles size={11} /> Automation-first
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Review email-derived status signals, assessment alerts, and confidence-scored suggestions.
          </p>
        </div>

        <button
          onClick={() => {
            fetchSuggestions();
            fetchIntegrations();
          }}
          className="refresh-signals-button flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-medium transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Signals</span>
        </button>
      </div>

      {/* Success Banner when application created/updated */}
      {acceptedToast && (
        <div className="p-4 rounded-xl bg-indigo-950/80 border border-indigo-700 text-white text-xs flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span>
              <strong>Application Created & Synced:</strong> {acceptedToast.company} has been added to your applications list.
            </span>
          </div>
          <button
            onClick={() => navigate(`/applications/${acceptedToast.appId}`)}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold text-xs transition-colors shrink-0"
          >
            <span>View Timeline</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* OAuth Success Alert */}
      {gmailConnected && (
        <div className="p-3.5 rounded-xl bg-[#12221A] border border-[#1A402B] text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#10B981] shrink-0" />
            <span>
              <strong>Gmail Account Connected!</strong>{' '}
              {searchParams.get('account') ? (
                <>
                  <strong className="text-white underline font-mono">{searchParams.get('account')}</strong> has been linked and is now monitored for application updates.
                </>
              ) : (
                'Your Gmail inbox is now securely linked.'
              )}
            </span>
          </div>
          <button
            onClick={() => setSearchParams({})}
            className="text-[#10B981] hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* OAuth Error Alert */}
      {oauthError && (
        <div className="p-3.5 rounded-xl bg-[#241418] border border-[#401C24] text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-[#F87171] shrink-0" />
            <span><strong>Authentication Alert:</strong> {oauthError}</span>
          </div>
          <button
            onClick={() => setSearchParams({})}
            className="text-[#F87171] hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Connected Gmail Inboxes Section */}
      <div className="p-6 rounded-xl bg-[#121418] border border-[#242830] border-t-[#343944] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-[#181B22] border border-[#272B35] text-[#EA4335] shrink-0">
              <Mail size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Connected Gmail Inboxes</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#142018] text-[#10B981] border border-[#1A3828]">
                  {gmailIntegrations.length} {gmailIntegrations.length === 1 ? 'Account' : 'Accounts'}
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Link one or multiple personal or university email inboxes to automatically capture job confirmations, assessments, and interview schedules.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {gmailIntegrations.length > 0 && (
              <button
                onClick={handleSyncAll}
                disabled={isSyncingAll || syncingIntegrationId !== null}
                className="automation-sync-all btn-secondary flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50"
              >
                <RefreshCw size={12} className={isSyncingAll ? 'animate-spin' : ''} />
                <span>{isSyncingAll ? 'Syncing All Inboxes...' : 'Sync All Inboxes'}</span>
              </button>
            )}

            <button
              onClick={handleConnectGmail}
              disabled={isConnectingGoogle}
              className="automation-add-gmail btn-primary flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50"
            >
              <Plus size={13} />
              <span>{gmailIntegrations.length > 0 ? 'Add Another Gmail Account' : 'Connect Gmail Account'}</span>
            </button>
          </div>
        </div>

        {/* List of Connected Accounts */}
        {gmailIntegrations.length > 0 ? (
          <div className="email-integration-list divide-y divide-[#1C1F25] border border-[#20232A] rounded-lg overflow-hidden bg-[#0C0E11]">
            {gmailIntegrations.map((account) => {
              const isSyncingThis = syncingIntegrationId === account.id || account.syncStatus === 'SYNCING';
              return (
                <div
                  key={account.id}
                  className="email-integration-row p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#101216] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-[#181B22] border border-[#272B35] flex items-center justify-center font-bold text-xs text-white shrink-0">
                      <Mail size={14} className="text-[#EA4335]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">{account.providerAccountId}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#142018] text-[#10B981] border border-[#1A3828] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                          Active
                        </span>
                      </div>
                      <div className="text-[11px] text-[#636B78] font-mono mt-0.5 flex items-center gap-2.5">
                        <span>{account._count?.processedEmails || 0} emails processed</span>
                        <span>•</span>
                        <span>Last scan: {account.lastSyncAt ? new Date(account.lastSyncAt).toLocaleString() : 'Never'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleSyncIntegration(account.id)}
                      disabled={isSyncingThis || isSyncingAll}
                      className="automation-sync-now btn-secondary flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium disabled:opacity-50"
                      title="Scan this inbox now"
                    >
                      <RefreshCw size={12} className={isSyncingThis ? 'animate-spin' : ''} />
                      <span>{isSyncingThis ? 'Scanning...' : 'Sync Now'}</span>
                    </button>

                    <button
                      onClick={() => handleDisconnectIntegration(account.id)}
                      className="p-1.5 text-[#636B78] hover:text-[#F43F5E] hover:bg-[#1E1418] rounded-md transition-colors"
                      title="Disconnect this account"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center rounded-lg border border-dashed border-[#242830] bg-[#0E1013] space-y-2">
            <p className="text-xs text-[#9CA3AF]">
              No Gmail accounts connected yet. Link one or more Gmail accounts to start monitoring job application emails.
            </p>
          </div>
        )}
      </div>

      {/* Suggestions Section with Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-200">
              Automation Suggestions ({suggestions.length})
            </h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'PENDING'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pending Review
            </button>
            <button
              onClick={() => setActiveTab('ACCEPTED')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'ACCEPTED'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Accepted History
            </button>
            <button
              onClick={() => setActiveTab('REJECTED')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'REJECTED'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dismissed
            </button>
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading suggestions...</div>
        ) : suggestions.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={activeTab === 'PENDING' ? 'No pending suggestions' : `No ${activeTab.toLowerCase()} suggestions`}
            description={
              activeTab === 'PENDING'
                ? 'All incoming email signals have been reviewed. When relevant emails arrive, suggested status updates will appear here.'
                : `No automation suggestions currently in ${activeTab.toLowerCase()} status.`
            }
          />
        ) : (
          <div className="space-y-4">
            {suggestions.map((sug) => {
              const p = sug.payload;
              const isHigh = sug.confidence >= 0.85;
              const isPending = sug.status === 'PENDING';
              const isAccepted = sug.status === 'ACCEPTED';
              const isDismissed = sug.status === 'REJECTED';

              return (
                <div
                  key={sug.id}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-400 shrink-0">
                        {p.detectedCompany?.charAt(0) || 'A'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-100">{p.detectedCompany}</span>
                          <span className="text-xs text-slate-400">— {p.detectedRole}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">
                            {isAccepted ? 'Status Applied:' : 'Suggested Action:'}
                          </span>
                          {p.targetStatus && <StatusPill status={p.targetStatus} size="sm" />}
                        </div>
                      </div>
                    </div>

                    {/* Status & Confidence badges */}
                    <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                      {isAccepted && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold border bg-emerald-950/70 text-emerald-300 border-emerald-800 flex items-center gap-1">
                          <Check size={12} /> Accepted & Added
                        </span>
                      )}
                      {isDismissed && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold border bg-slate-800 text-slate-400 border-slate-700">
                          Dismissed
                        </span>
                      )}
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                          isHigh
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                            : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                        }`}
                      >
                        {Math.round(sug.confidence * 100)}% Confidence
                      </span>
                    </div>
                  </div>

                  {/* Transparent Explanation & Full Email Details */}
                  <div className="email-detail-panel p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-3 text-xs text-slate-300">
                    <div className="flex items-start gap-2">
                      <ShieldCheck size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-200">System Reasoning:</span>{' '}
                        <span>{p.reason}</span>
                      </div>
                    </div>

                    {/* Email Metadata */}
                    <div className="pt-2 border-t border-slate-900/80 space-y-2 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400">
                        {p.sender && (
                          <div className="truncate">
                            <span className="text-slate-500 font-medium">From:</span>{' '}
                            <span className="text-slate-300 font-mono">{p.sender}</span>
                          </div>
                        )}
                        {p.subject && (
                          <div className="truncate font-medium text-slate-200">
                            <span className="text-slate-500 font-normal">Subject:</span> "{p.subject}"
                          </div>
                        )}
                      </div>

                      {/* Expandable Body vs Snippet */}
                      {p.body ? (
                        <div className="pt-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Email Message Body
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleEmailExpanded(sug.id)}
                              className="email-body-toggle inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-950/70 px-2.5 py-1 rounded-md border border-indigo-800/50 transition-colors"
                            >
                              <span>{expandedEmailIds[sug.id] ? 'Hide Full Email' : 'Read Full Email Body'}</span>
                              {expandedEmailIds[sug.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          </div>

                          {expandedEmailIds[sug.id] ? (
                            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 max-h-96 overflow-y-auto custom-scrollbar select-text text-slate-200 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                              {cleanEmailDisplay(p.body)}
                            </div>
                          ) : (
                            <p className="text-slate-400 line-clamp-2 italic text-[11px] bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                              "{cleanEmailDisplay(p.snippet || p.body.slice(0, 160))}..."
                            </p>
                          )}
                        </div>
                      ) : p.snippet ? (
                        <div className="pt-1">
                          <div className="text-slate-400 line-clamp-2 italic text-[11px] bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                            "{cleanEmailDisplay(p.snippet)}"
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Inline Manual Fixes Form */}
                  {editingId === sug.id && (
                    <div className="p-4 rounded-xl bg-slate-950/90 border border-indigo-500/40 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <Pencil size={14} className="text-indigo-400" />
                          <span className="text-xs font-semibold text-slate-200">
                            Manual Fixes & Review {sug.applicationId ? '(Existing Application)' : '(New Application)'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={closeEditPanel}
                          className="text-slate-400 hover:text-slate-200 p-1 rounded"
                          title="Cancel editing"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-400 mb-1">Company</label>
                          <input
                            type="text"
                            value={editDraft.company}
                            onChange={(e) => setEditDraft({ ...editDraft, company: e.target.value })}
                            placeholder="e.g. Google"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-400 mb-1">Job Title / Role</label>
                          <input
                            type="text"
                            value={editDraft.role}
                            onChange={(e) => setEditDraft({ ...editDraft, role: e.target.value })}
                            placeholder="e.g. Software Engineer"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-400 mb-1">Application Status</label>
                          <select
                            value={editDraft.status}
                            onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <EditField label="Date Applied" type="date" value={editDraft.appliedAt} onChange={(value) => setEditDraft({ ...editDraft, appliedAt: value })} />
                        <EditField label="Job Posting URL" type="url" value={editDraft.jobUrl} placeholder="https://…" onChange={(value) => setEditDraft({ ...editDraft, jobUrl: value })} />
                        <EditField label="Job Requisition ID" value={editDraft.jobId} placeholder="REQ-12345" onChange={(value) => setEditDraft({ ...editDraft, jobId: value })} />
                      </div>

                      <details className="group rounded-lg border border-slate-800 bg-slate-950/40" open>
                        <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold text-slate-300 marker:text-indigo-400">Application details, recruiter & follow-up</summary>
                        <div className="grid grid-cols-1 gap-3 border-t border-slate-800 p-3 sm:grid-cols-3">
                          <EditSelect label="Source" value={editDraft.source} onChange={(value) => setEditDraft({ ...editDraft, source: value })} options={['LINKEDIN', 'COMPANY_WEBSITE', 'INDEED', 'REFERRAL', 'CAMPUS_PLACEMENT', 'RECRUITER', 'JOB_BOARD', 'OTHER']} />
                          <EditSelect label="Work Mode" value={editDraft.workMode} onChange={(value) => setEditDraft({ ...editDraft, workMode: value })} options={['REMOTE', 'HYBRID', 'ONSITE']} />
                          <EditSelect label="Priority" value={editDraft.priority} onChange={(value) => setEditDraft({ ...editDraft, priority: value })} options={['LOW', 'MEDIUM', 'HIGH', 'URGENT']} />
                          <EditField label="Location" value={editDraft.location} placeholder="San Francisco, CA" onChange={(value) => setEditDraft({ ...editDraft, location: value })} />
                          <EditField label="Salary / Range" value={editDraft.salary} placeholder="$120k – $150k" onChange={(value) => setEditDraft({ ...editDraft, salary: value })} />
                          <div className="flex items-end gap-2 pb-1"><input id={`follow-up-${sug.id}`} type="checkbox" checked={editDraft.scheduleFollowUp} onChange={(e) => setEditDraft({ ...editDraft, scheduleFollowUp: e.target.checked })} className="h-4 w-4" /><label htmlFor={`follow-up-${sug.id}`} className="text-[11px] font-medium text-slate-300">Schedule follow-up</label></div>
                          <EditField label="Recruiter Name" value={editDraft.recruiterName} placeholder="Jane Smith" onChange={(value) => setEditDraft({ ...editDraft, recruiterName: value })} />
                          <EditField label="Recruiter Email" type="email" value={editDraft.recruiterEmail} placeholder="jane@company.com" onChange={(value) => setEditDraft({ ...editDraft, recruiterEmail: value })} />
                          <EditSelect label="Follow up in" value={String(editDraft.customFollowUpDays)} onChange={(value) => setEditDraft({ ...editDraft, customFollowUpDays: Number(value) })} options={['3', '5', '7', '14']} />
                          <div className="sm:col-span-3"><label className="mb-1 block text-[11px] font-medium text-slate-400">Notes & context</label><textarea value={editDraft.notes} onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })} rows={3} placeholder="Interview notes, referral context, compensation target…" className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" /></div>
                        </div>
                      </details>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
                        <button
                          type="button"
                          onClick={closeEditPanel}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolve(sug.id, 'ACCEPT', sug.applicationId || undefined, editDraft)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
                        >
                          <CheckCircle2 size={13} />
                          <span>Save & Accept</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons & Links */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    {sug.applicationId ? (
                      <button
                        onClick={() => navigate(`/applications/${sug.applicationId}`)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline font-medium"
                      >
                        <Building size={13} />
                        <span>View Application ({sug.application?.company?.name || p.detectedCompany})</span>
                        <ExternalLink size={12} />
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">New Application (Not yet tracked)</span>
                    )}

                    {isPending ? (
                      editingId === sug.id ? (
                        <span className="text-xs text-indigo-400 font-medium italic">
                          Editing details above...
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResolve(sug.id, 'REJECT')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                          >
                            <XCircle size={14} />
                            <span>Dismiss</span>
                          </button>
                          <button
                            onClick={() => openEditPanel(sug)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-indigo-300 rounded-lg text-xs font-medium transition-colors"
                            title="Edit extracted company, role or status before accepting"
                          >
                            <Pencil size={13} />
                            <span>Edit Before Accepting</span>
                          </button>
                          <button
                            onClick={() => handleResolve(sug.id, 'ACCEPT')}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                          >
                            <CheckCircle2 size={14} />
                            <span>{sug.applicationId ? `Accept & Move to ${p.targetStatus || 'Next Step'}` : 'Accept & Track Application'}</span>
                          </button>
                        </div>
                      )
                    ) : isAccepted && sug.applicationId ? (
                      <button
                        onClick={() => navigate(`/applications/${sug.applicationId}`)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-700/60 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <span>Open Application</span>
                        <ArrowRight size={13} />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const editInputClass = 'w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500';
const EditField: React.FC<{ label: string; value: string; type?: string; placeholder?: string; onChange: (value: string) => void }> = ({ label, value, type = 'text', placeholder, onChange }) => <div><label className="mb-1 block text-[11px] font-medium text-slate-400">{label}</label><input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={editInputClass} /></div>;
const EditSelect: React.FC<{ label: string; value: string; options: string[]; onChange: (value: string) => void }> = ({ label, value, options, onChange }) => <div><label className="mb-1 block text-[11px] font-medium text-slate-400">{label}</label><select value={value} onChange={(e) => onChange(e.target.value)} className={editInputClass}>{options.map((option) => <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>)}</select></div>;
