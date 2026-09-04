import { useState, useEffect } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Clock,
  UserCheck,
  AlertTriangle,
  FileText,
  Trash2,
  CheckCircle2,
  ChevronLeft,
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex.js';
import useAuthStore from '../store/authStore';

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export default function NotificationDrawer({ isOpen, onClose }) {
  const user = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  // Body scroll lock while drawer is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Real-time query for notifications relevant to this worker
  const allNotifications = useQuery(
    api.notifications.getWorkerNotifications,
    user?.id ? { workerId: user.id } : {}
  ) || [];

  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const removeNotification = useMutation(api.notifications.remove);

  const [isMarking, setIsMarking] = useState(false);

  if (!isOpen) return null;

  const unreadCount = allNotifications.filter((n) => !n.isRead).length;

  const notifications = filter === 'unread'
    ? allNotifications.filter((n) => !n.isRead)
    : allNotifications;

  const handleMarkAllRead = async () => {
    setIsMarking(true);
    try {
      await markAllRead({ workerId: user?.id });
    } catch (err) {
      console.warn('Failed to mark all as read:', err);
    } finally {
      setIsMarking(false);
    }
  };

  const handleItemClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await markRead({ notificationId: notification._id });
      } catch (err) {
        console.warn('Failed to mark read:', err);
      }
    }
  };

  const handleDelete = async (e, notificationId) => {
    e.stopPropagation();
    try {
      await removeNotification({ notificationId });
    } catch (err) {
      console.warn('Failed to remove notification:', err);
    }
  };

  const getIcon = (type, title = '') => {
    const t = (type || title).toLowerCase();
    if (t.includes('proxy') || t.includes('approval')) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
          <UserCheck size={16} />
        </div>
      );
    }
    if (t.includes('shift') || t.includes('clock') || t.includes('attendance')) {
      return (
        <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
          <Clock size={16} />
        </div>
      );
    }
    if (t.includes('dispute') || t.includes('rfi')) {
      return (
        <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
          <FileText size={16} />
        </div>
      );
    }
    if (t.includes('warning') || t.includes('alert') || t.includes('restricted')) {
      return (
        <div className="w-8 h-8 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
          <AlertTriangle size={16} />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
        <Bell size={16} />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col sm:flex-row sm:justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
      {/* Click-away backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Container (Full screen on mobile, slide-over panel on desktop) */}
      <div
        className="relative w-full sm:max-w-md bg-surface-card border-l border-border h-full max-h-screen shadow-2xl flex flex-col z-10 animate-slide-left overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
      >
        {/* Header */}
        <header className="h-16 px-4 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-surface-card text-text-secondary hover:text-text-primary transition-colors sm:hidden"
              aria-label="Back"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-heading text-text-primary">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary text-white">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isMarking}
                title="Mark all as read"
                className="px-2.5 py-1.5 rounded-md hover:bg-surface-card border border-border text-text-secondary hover:text-primary transition-colors text-xs font-semibold flex items-center gap-1.5"
              >
                <CheckCheck size={14} />
                <span>Mark All Read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-surface-card text-text-muted hover:text-text-primary transition-colors hidden sm:flex"
              aria-label="Close notifications"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Filter Pills */}
        <div className="px-4 py-2.5 bg-surface border-b border-border flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={[
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                filter === 'all'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-card border border-border text-text-secondary hover:text-text-primary',
              ].join(' ')}
            >
              All ({allNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={[
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                filter === 'unread'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-card border border-border text-text-secondary hover:text-text-primary',
              ].join(' ')}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
            <button
              type="button"
              onClick={async () => {
                await Notification.requestPermission();
                // Force re-render
                setFilter((f) => f);
              }}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              Enable Push
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border p-3 space-y-2">
          {notifications.length > 0 ? (
            notifications.map((item) => (
              <div
                key={item._id}
                onClick={() => handleItemClick(item)}
                className={[
                  'p-3.5 rounded-lg transition-all cursor-pointer flex items-start justify-between gap-3 border shadow-xs',
                  item.isRead
                    ? 'bg-surface-card border-border opacity-85 hover:opacity-100 hover:bg-surface'
                    : 'bg-blue-50/40 border-primary/20 hover:bg-blue-50/70',
                ].join(' ')}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {getIcon(item.type, item.title)}
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-text-primary truncate">
                        {item.title}
                      </span>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0 ring-2 ring-blue-100" />
                      )}
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {item.desc}
                    </p>
                    <span className="text-[10px] text-text-muted mt-0.5 font-medium">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDelete(e, item._id)}
                  title="Dismiss notification"
                  className="p-1.5 text-text-muted hover:text-red-600 rounded-full hover:bg-surface transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-surface border border-border flex items-center justify-center text-text-muted">
                <CheckCircle2 size={28} className="text-emerald-500" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-bold text-text-primary">
                  {filter === 'unread' ? 'No Unread Notifications' : 'All Caught Up!'}
                </p>
                <p className="text-xs text-text-muted max-w-[220px]">
                  {filter === 'unread'
                    ? 'You have read all your notifications.'
                    : 'You have no notifications or shift alerts right now.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

