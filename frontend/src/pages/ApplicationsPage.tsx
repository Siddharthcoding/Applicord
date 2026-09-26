import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Application, ApplicationStatus, Priority, WorkMode } from '../types';
import { StatusPill } from '../components/common/StatusPill';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { ChangeStatusModal } from '../components/applications/ChangeStatusModal';
import { TableSkeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Building2,
  Calendar,
  ExternalLink,
  Trash2,
  Archive,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';

export const ApplicationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { onOpenAddModal } = useOutletContext<{ onOpenAddModal: () => void }>();

  const [applications, setApplications] = useState<Application[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Sorting state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'ALL');
  const [sourceFilter, setSourceFilter] = useState<string>(searchParams.get('source') || 'ALL');
  const [workModeFilter, setWorkModeFilter] = useState<string>(searchParams.get('workMode') || 'ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>(searchParams.get('priority') || 'ALL');
  const [sortBy, setSortBy] = useState<string>('appliedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkActing, setIsBulkActing] = useState(false);

  // Status Modal
  const [statusModalApp, setStatusModalApp] = useState<Application | null>(null);

  const fetchApplications = async (page = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        sortBy,
        sortOrder,
      });

      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (sourceFilter !== 'ALL') params.set('source', sourceFilter);
      if (workModeFilter !== 'ALL') params.set('workMode', workModeFilter);
      if (priorityFilter !== 'ALL') params.set('priority', priorityFilter);

      const res = await apiRequest<{ applications: Application[] }>(`/applications?${params.toString()}`);
      
      // Check response structure
      if (Array.isArray(res)) {
        setApplications(res);
      } else if (res && (res as any).applications) {
        setApplications((res as any).applications);
        if ((res as any).pagination) setPagination((res as any).pagination);
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error('Failed to load applications', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications(1);
    window.addEventListener('applylog_application_created', () => fetchApplications(1));
  }, [statusFilter, sourceFilter, workModeFilter, priorityFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplications(1);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === applications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(applications.map((a) => a.id));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkAction = async (action: string, payload?: any) => {
    if (selectedIds.length === 0) return;
    try {
      setIsBulkActing(true);
      await apiRequest('/applications/bulk-action', {
        method: 'POST',
        body: JSON.stringify({
          applicationIds: selectedIds,
          action,
          payload,
        }),
      });
      setSelectedIds([]);
      fetchApplications(pagination.page);
    } catch (err: any) {
      alert(err.message || 'Bulk action failed');
    } finally {
      setIsBulkActing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Applications</h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete database of submitted applications with full timeline audit trails.
          </p>
        </div>
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>Add Application</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company, role, ID, location, or notes..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="applications-filter-button px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors shrink-0"
          >
            Filter
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="SAVED">Saved</option>
            <option value="APPLIED">Applied</option>
            <option value="VIEWED">Viewed</option>
            <option value="ASSESSMENT">Assessment</option>
            <option value="INTERVIEW">Interview</option>
            <option value="OFFER">Offer</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Sources</option>
            <option value="LINKEDIN">LinkedIn</option>
            <option value="COMPANY_WEBSITE">Company Site</option>
            <option value="INDEED">Indeed</option>
            <option value="REFERRAL">Referral</option>
            <option value="RECRUITER">Recruiter</option>
            <option value="BROWSER_EXTENSION">Extension</option>
          </select>

          {/* Work Mode Filter */}
          <select
            value={workModeFilter}
            onChange={(e) => setWorkModeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Work Modes</option>
            <option value="REMOTE">Remote</option>
            <option value="HYBRID">Hybrid</option>
            <option value="ONSITE">Onsite</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          {/* Sort Field */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
          >
            <option value="appliedAt">Sort: Date Applied</option>
            <option value="updatedAt">Sort: Last Updated</option>
            <option value="company">Sort: Company</option>
            <option value="priority">Sort: Priority</option>
          </select>

          {/* Sort Order */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 hover:bg-slate-900 transition-colors"
          >
            <ArrowUpDown size={13} />
            <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-indigo-950/60 border border-indigo-800/80 rounded-xl flex items-center justify-between animate-in fade-in">
          <span className="text-xs font-semibold text-indigo-200">
            {selectedIds.length} application(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('ARCHIVE')}
              disabled={isBulkActing}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              <Archive size={13} />
              <span>Archive</span>
            </button>
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to permanently delete ${selectedIds.length} applications?`)) {
                  handleBulkAction('DELETE');
                }
              }}
              disabled={isBulkActing}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-medium transition-colors"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : applications.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              icon={Building2}
              title="No applications match your criteria"
              description="Try adjusting your search terms or filters to find what you are looking for."
              actionLabel="Clear Filters"
              onAction={() => {
                setSearch('');
                setStatusFilter('ALL');
                setSourceFilter('ALL');
                setWorkModeFilter('ALL');
                setPriorityFilter('ALL');
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === applications.length && applications.length > 0}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                    />
                  </th>
                  <th className="p-3.5">Company & Role</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Applied Date</th>
                  <th className="p-3.5">Source & Mode</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Next Follow-up</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {applications.map((app) => {
                  const isSelected = selectedIds.includes(app.id);
                  const nextReminder = app.reminders && app.reminders.length > 0 ? app.reminders[0] : null;

                  return (
                    <tr
                      key={app.id}
                      onClick={() => navigate(`/applications/${app.id}`)}
                      className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center" onClick={(e) => toggleSelectOne(app.id, e)}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                        />
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-400 shrink-0">
                            {app.company.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                              <span>{app.company.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                ({app.publicId})
                              </span>
                            </div>
                            <div className="text-slate-400 text-xs truncate max-w-xs">
                              {app.jobTitle}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setStatusModalApp(app)}
                          className="hover:opacity-80 transition-opacity"
                          title="Click to change status"
                        >
                          <StatusPill status={app.currentStatus} size="sm" />
                        </button>
                      </td>

                      <td className="p-3.5 text-slate-300">
                        {new Date(app.appliedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="p-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-300 font-medium">{app.source}</span>
                          <span className="text-[10px] text-slate-500">{app.workMode}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <PriorityBadge priority={app.priority} size="sm" />
                      </td>

                      <td className="p-3.5">
                        {nextReminder ? (
                          <div className="flex items-center gap-1.5 text-amber-300 text-xs font-medium">
                            <Calendar size={12} className="shrink-0" />
                            <span>
                              {new Date(nextReminder.dueAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/applications/${app.id}`)}
                          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <ExternalLink size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {applications.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {applications.length} applications
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchApplications(pagination.page - 1)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="font-medium text-slate-300">Page {pagination.page}</span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchApplications(pagination.page + 1)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Change Status Modal */}
      {statusModalApp && (
        <ChangeStatusModal
          isOpen={!!statusModalApp}
          onClose={() => setStatusModalApp(null)}
          applicationId={statusModalApp.id}
          currentStatus={statusModalApp.currentStatus}
          companyName={statusModalApp.company.name}
          jobTitle={statusModalApp.jobTitle}
          onSuccess={() => {
            setStatusModalApp(null);
            fetchApplications(pagination.page);
          }}
        />
      )}
    </div>
  );
};
