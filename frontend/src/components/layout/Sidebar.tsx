import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Briefcase,
  Kanban,
  Calendar,
  Sparkles,
  BarChart3,
  Users,
  FileText,
  FileSpreadsheet,
  Settings,
  X,
  Compass,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const coreItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Applications', path: '/applications', icon: Briefcase },
    { label: 'Kanban Board', path: '/kanban', icon: Kanban },
    { label: 'Calendar & Tasks', path: '/calendar', icon: Calendar },
  ];

  const intelligenceItems = [
    { label: 'Automation Center', path: '/automation', icon: Sparkles, badge: 'Sync' },
    { label: 'Analytics & Insights', path: '/analytics', icon: BarChart3 },
  ];

  const assetItems = [
    { label: 'Recruiter Contacts', path: '/contacts', icon: Users },
    { label: 'Document Vault', path: '/documents', icon: FileText },
    { label: 'Import / Export', path: '/import-export', icon: FileSpreadsheet },
  ];

  const navLinkClass = (isActive: boolean) =>
    `sidebar-link flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
      isActive
        ? 'sidebar-link-active bg-[#181B20] text-white border-l-2 border-[#4F65F6]'
        : 'text-[#9CA3AF] hover:text-white hover:bg-[#121418]'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`workspace-sidebar fixed top-0 bottom-0 left-0 z-40 w-64 flex flex-col transition-transform duration-150 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Workspace Brand Header */}
        <div className="h-14 px-4 border-b border-[#1C1F26] flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="workspace-logo w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs">
              ✦
            </div>
            <div>
              <span className="font-semibold text-xs tracking-tight text-white">Applicord</span>
              <span className="block text-[10px] text-[#636B78] font-mono -mt-0.5">MOVE WITH INTENTION</span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden text-[#9CA3AF] hover:text-white p-1 rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="sidebar-nav flex-1 px-3 py-5 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Section 1: Core */}
          <div className="space-y-0.5">
            <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#5A606D] font-medium">
              Core
            </div>
            {coreItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} className="shrink-0 text-[#636B78]" />
                    <span>{item.label}</span>
                  </div>
                </NavLink>
              );
            })}
          </div>

          {/* Section 2: Automation */}
          <div className="space-y-0.5">
            <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#5A606D] font-medium">
              Intelligence
            </div>
            {intelligenceItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} className="shrink-0 text-[#636B78]" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1A2620] text-[#10B981] border border-[#1F3E2F]">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Section 3: Data */}
          <div className="space-y-0.5">
            <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#5A606D] font-medium">
              Data & Assets
            </div>
            {assetItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} className="shrink-0 text-[#636B78]" />
                    <span>{item.label}</span>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="sidebar-footer p-3 border-t border-[#1C1F26] bg-[#0A0B0E] space-y-1.5">
          <Link
            to="/landing"
            className="flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] text-[#9CA3AF] hover:text-white hover:bg-[#14161C] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Compass size={13} className="text-[#636B78]" />
              <span>Public Landing Page</span>
            </div>
            <span className="font-mono text-[10px] text-[#5A606D]">↗</span>
          </Link>

          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors ${
                isActive
                  ? 'bg-[#181B20] text-white font-medium'
                  : 'text-[#9CA3AF] hover:text-white hover:bg-[#14161C]'
              }`
            }
          >
            <div className="flex items-center gap-2">
              <Settings size={14} className="text-[#636B78]" />
              <span>Settings</span>
            </div>
          </NavLink>

          {/* User profile */}
          {user && (
            <div className="pt-2 border-t border-[#1A1D23] flex items-center justify-between px-1">
              <div className="flex items-center gap-2 truncate">
                <div className="w-6 h-6 rounded bg-[#22252C] border border-[#2F333C] flex items-center justify-center font-bold text-[11px] text-white shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="text-xs font-medium text-white truncate">{user.name}</div>
                  <div className="text-[10px] text-[#636B78] truncate font-mono">{user.email}</div>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1 text-[#636B78] hover:text-[#F43F5E] hover:bg-[#1E1418] rounded transition-colors"
                title="Log out"
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
