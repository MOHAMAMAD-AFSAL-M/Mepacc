import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../convex.js';
import useAuthStore from '../store/authStore';
import NotificationDrawer from './NotificationDrawer';

export default function NotificationBellButton({ className = 'text-text-primary', size = 20 }) {
  const [isOpen, setIsOpen] = useState(false);
  const user = useAuthStore((s) => s.user);

  const notifications = useQuery(
    api.notifications.getWorkerNotifications,
    user?.id ? { workerId: user.id } : {}
  ) || [];

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-full hover:bg-surface-card active:scale-95 transition-all flex items-center justify-center"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell size={size} className={className} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-surface animate-pulse" />
        )}
      </button>

      <NotificationDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
