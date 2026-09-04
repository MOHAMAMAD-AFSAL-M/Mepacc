import { useState } from 'react';
import { ShieldAlert, Smartphone, LogOut, RefreshCw, AlertTriangle } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../convex.js';
import useAuthStore from '../store/authStore';
import { getOrCreateDeviceSessionId, claimSession } from '../services/authService';

export default function SessionEnforcerModal() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  const [isReclaiming, setIsReclaiming] = useState(false);
  const [reclaimError, setReclaimError] = useState('');

  // Live real-time query of the worker's active session
  const activeSession = useQuery(
    api.workers.getActiveSession,
    isAuthenticated && user?.id ? { workerId: user.id } : 'skip'
  );

  if (!isAuthenticated || !user?.id || !activeSession) {
    return null;
  }

  const localSessionId = getOrCreateDeviceSessionId();
  const serverSessionId = activeSession.currentSessionId;

  // If server has a recorded session token and it differs from this device's token
  const isOverridden = Boolean(serverSessionId && serverSessionId !== localSessionId);

  if (!isOverridden) {
    return null;
  }

  const handleClaim = async () => {
    setIsReclaiming(true);
    setReclaimError('');
    try {
      await claimSession(user.id);
    } catch (err) {
      console.error('Failed to reclaim session:', err);
      setReclaimError(err.message || 'Failed to claim session on this device.');
    } finally {
      setIsReclaiming(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const lastDevice = activeSession.lastDeviceName || 'Another Device';
  const lastTime = activeSession.lastSessionAt
    ? new Date(activeSession.lastSessionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'recently';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-sm bg-surface-card border border-border rounded-lg shadow-2xl p-5 flex flex-col gap-4 text-center animate-scale-up"
        role="alertdialog"
        aria-labelledby="session-override-title"
        aria-describedby="session-override-desc"
      >
        {/* Icon & Title */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-inner">
            <Smartphone size={28} strokeWidth={2} />
          </div>
          <h2 id="session-override-title" className="text-lg font-bold font-heading text-text-primary">
            Logged In On Another Device
          </h2>
          <p id="session-override-desc" className="text-xs text-text-secondary leading-relaxed">
            Your account was accessed on <strong className="text-text-primary">{lastDevice}</strong> at {lastTime}. For attendance and location security, only one active device is permitted.
          </p>
        </div>

        {/* Status Callout */}
        <div className="p-3 bg-surface border border-border rounded-md text-left flex items-start gap-2.5">
          <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-text-secondary">
            <span className="font-semibold text-text-primary block">Single Device Policy</span>
            Continuing on this device will automatically log out the other device.
          </div>
        </div>

        {reclaimError && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2 text-left">
            <AlertTriangle size={14} className="shrink-0 text-red-600" />
            <span>{reclaimError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleClaim}
            disabled={isReclaiming}
            className="w-full py-3 px-4 rounded-md bg-primary hover:bg-primary-dark text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {isReclaiming ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Switching to This Device...</span>
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                <span>Use on This Device (Override)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 px-4 rounded-md border border-border bg-surface hover:bg-surface-card text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
