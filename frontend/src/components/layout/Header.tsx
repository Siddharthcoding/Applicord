import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, Sparkles, Menu, Moon, Sun } from 'lucide-react';
import { NotificationDropdown } from '../common/NotificationDropdown';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  onOpenCommandPalette: () => void;
  onOpenAddModal: () => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCommandPalette,
  onOpenAddModal,
  onToggleSidebar,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="workspace-header h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Input */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded text-[#9CA3AF] hover:text-white hover:bg-[#181B20] transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={18} />
        </button>

        <button
          onClick={onOpenCommandPalette}
          className="w-full max-w-sm flex items-center justify-between px-3 py-1.5 rounded-md bg-[#121418] border border-[#20232A] text-xs text-[#8A909D] hover:border-[#2F3542] hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Search size={13} className="text-[#636B78]" />
            <span className="truncate text-[11px]">Search applications, signals...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-[#1B1E26] border border-[#262A34] text-[10px] text-[#8A909D] font-mono">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <button
          onClick={() => navigate('/automation')}
          className="header-automation-button hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#9CA3AF] hover:text-white bg-[#14161C] border border-[#22252E] hover:border-[#303542] transition-colors"
        >
          <Sparkles size={13} className="text-[#10B981]" />
          <span>Automation</span>
        </button>

        <button
          onClick={onOpenAddModal}
          className="header-add-application btn-primary flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Add Application</span>
        </button>

        <NotificationDropdown />

        <button
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        >
          <Sun size={14} className="theme-sun" />
          <Moon size={14} className="theme-moon" />
          <span className="theme-toggle-knob" />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-[#1C1F26]">
          <button
            onClick={() => navigate('/settings')}
            className="profile-trigger w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
            title={user?.name || user?.email}
            aria-label="Open account settings"
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </button>
        </div>
      </div>
    </header>
  );
};
