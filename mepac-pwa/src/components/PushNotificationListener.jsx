import { useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex.js';
import useAuthStore from '../store/authStore';
import {
  isNotificationSupported,
  requestNotificationPermission,
  showBrowserNotification,
} from '../services/pushNotificationService';

/**
 * PushNotificationListener — Global background component.
 * Reactively monitors Convex real-time notifications for the current logged-in worker,
 * and pushes native alerts directly into the Mobile Phone / Browser Notification Bar.
 */
export default function PushNotificationListener() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Set of already notified IDs during this session to prevent duplicate popups on initial mount
  const initializedRef = useRef(false);
  const seenNotifIdsRef = useRef(new Set());

  // Request browser permission once when authenticated
  useEffect(() => {
    if (isAuthenticated && isNotificationSupported()) {
      if (Notification.permission === 'default') {
        requestNotificationPermission();
      }
    }
  }, [isAuthenticated]);

  // Reactive subscription to notifications for this worker / designer
  const notifications = useQuery(
    api.notifications.getWorkerNotifications,
    user?.id ? { workerId: user.id } : {}
  );

  useEffect(() => {
    if (!notifications || !Array.isArray(notifications)) return;

    // First time loading: mark all currently existing notifications as seen so we don't spam popups on login
    if (!initializedRef.current) {
      notifications.forEach((n) => {
        seenNotifIdsRef.current.add(n._id);
      });
      initializedRef.current = true;
      return;
    }

    // Subsequent updates: detect brand-new unread notifications
    for (const notif of notifications) {
      if (!seenNotifIdsRef.current.has(notif._id) && !notif.isRead) {
        seenNotifIdsRef.current.add(notif._id);

        // Trigger native mobile phone / browser notification bar alert
        showBrowserNotification({
          title: notif.title,
          body: notif.desc,
          tag: notif._id,
        });
      }
    }
  }, [notifications]);

  return null;
}
