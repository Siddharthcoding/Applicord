import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  LayoutDashboard,
  Briefcase,
  Kanban,
  Calendar,
  Sparkles,
  BarChart3,
  Users,
  FileText,
  Settings,
  X,
} from 'lucide-react';
import { apiRequest } from '../../api/client';
import { Application } from '../../types';
import { StatusPill } from './StatusPill';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddModal: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenAddModal,
}) => {
  const [query, setQuery] = useState('');
  const [applications, setApplications] = useState<Application[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setApplications([]);
      return;
    }

    if (!query.trim()) {
      setApplications([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await apiRequest<{ applications: Application[] }>(`/applications?search=${encodeURIComponent(query)}&limit=5`);
        setApplications(res.applications || (res as any) || []);
      } catch {
        setApplications([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickNav = [
    { label: 'Add New Application', icon: PlusCircle, action: () => { onClose(); onOpenAddModal(); } },
    { label: 'Go to Dashboard', icon: LayoutDashboard, action: () => { onClose(); navigate('/dashboard'); } },
    { label: 'View Applications', icon: Briefcase, action: () => { onClose(); navigate('/applications'); } },
    { label: 'Open Kanban Board', icon: Kanban, action: () => { onClose(); navigate('/kanban'); } },
    { label: 'Reminders & Calendar', icon: Calendar, action: () => { onClose(); navigate('/calendar'); } },
    { label: 'Automation Suggestions', icon: Sparkles, action: () => { onClose(); navigate('/automation'); } },
    { label: 'Application Analytics', icon: BarChart3, action: () => { onClose(); navigate('/analytics'); } },
    { label: 'Recruiter Contacts', icon: Users, action: () => { onClose(); navigate('/contacts'); } },
    { label: 'Document Vault', icon: FileText, action: () => { onClose(); navigate('/documents'); } },
    { label: 'Settings & Automation Rules', icon: Settings, action: () => { onClose(); navigate('/settings'); } },
  ];

  const filteredNav = query.trim()
    ? quickNav.filter(n => n.label.toLowerCase().includes(query.toLowerCase()))
    : quickNav;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-10">
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <Search size={18} className="text-slate-400 shrink-0 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search applications, companies, or commands..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2 custom-scrollbar space-y-3">
          {/* Live Application Search Matches */}
          {applications.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Matching Applications
              </div>
              <div className="space-y-1">
                {applications.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      onClose();
                      navigate(`/applications/${app.id}`);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm hover:bg-slate-800/80 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-400">
                        {app.company.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-200 group-hover:text-indigo-300">
                          {app.company.name}
                        </div>
                        <div className="text-xs text-slate-400">{app.jobTitle}</div>
                      </div>
                    </div>
                    <StatusPill status={app.currentStatus} size="sm" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions & Navigation */}
          <div>
            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Navigation & Actions
            </div>
            <div className="space-y-0.5">
              {filteredNav.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={i}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-800/70 transition-colors"
                  >
                    <Icon size={16} className="text-slate-400" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Navigate with arrows or click</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">ESC</kbd> to close</span>
        </div>
      </div>
    </div>
  );
};
