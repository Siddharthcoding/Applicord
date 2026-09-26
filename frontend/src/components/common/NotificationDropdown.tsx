import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Clock, Sparkles, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../api/client';
import { NotificationItem } from '../../types';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await apiRequest<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications');
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);

      // Notify the application so review sections update in real-time
      window.dispatchEvent(new Event('applylog_suggestions_updated'));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, link?: string | null) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
      fetchNotifications();
      if (link) {
        setIsOpen(false);
        navigate(link);
      }
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/all/read', { method: 'PATCH' });
      fetchNotifications();
    } catch {
      // ignore
    }
  };

  const getIcon = (type: string) => {
    if (type.includes('EMAIL') || type.includes('SUGGESTION')) {
      return <Sparkles size={14} className="text-amber-400" />;
    }
    if (type.includes('OVERDUE')) {
      return <AlertCircle size={14} className="text-rose-400" />;
    }
    return <Clock size={14} className="text-blue-400" />;
  };

  return (
    <div className="notification-dropdown relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="notification-trigger relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-count absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-medium border border-indigo-800/60">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-400 font-medium transition-colors"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                You're all caught up! No notifications.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id, n.link)}
                  className={`notification-item p-3.5 hover:bg-slate-800/60 transition-colors cursor-pointer flex gap-3 items-start ${
                    !n.readAt ? 'bg-indigo-950/20' : ''
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-md bg-slate-800 border border-slate-700 shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-medium truncate ${!n.readAt ? 'text-slate-100' : 'text-slate-300'}`}>
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
