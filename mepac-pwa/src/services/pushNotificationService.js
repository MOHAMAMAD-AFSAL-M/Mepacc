/**
 * pushNotificationService.js
 * Bridges Convex real-time notifications with native Browser / Mobile Phone notification bar (Web Notifications API & Service Worker).
 */

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'denied';
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return 'denied';
  }
}

export async function showBrowserNotification({ title, body, tag, icon = '/icons/icon-192.png' }) {
  if (!isNotificationSupported()) return;

  // Request permission if not already granted or denied
  if (Notification.permission === 'default') {
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') return;
  }

  if (Notification.permission !== 'granted') return;

  const options = {
    body,
    icon,
    badge: icon,
    tag: tag || `mepac_notif_${Date.now()}`,
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: window.location.origin,
    },
  };

  // Try Service Worker registration first (standard for mobile PWA notification bars)
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return;
      }
    }
  } catch (err) {
    console.warn('ServiceWorker notification display fallback:', err);
  }

  // Fallback to standard Window Notification
  try {
    const n = new Notification(title, options);
    n.onclick = function () {
      window.focus();
      this.close();
    };
  } catch (e) {
    console.warn('Window Notification failed:', e);
  }
}
