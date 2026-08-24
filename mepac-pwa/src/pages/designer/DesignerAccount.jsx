import { useNavigate } from 'react-router-dom';
import { Building2, Lock, ChevronRight, LogOut, Smartphone, ShieldCheck, Layers, User } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import Card from '../../components/Card';
import Button from '../../components/Button';
import NotificationBellButton from '../../components/NotificationBellButton';

/**
 * DesignerAccount — Account & Settings page for the Designer role.
 * Streamlined purely for profile, session security, and PIN management (no attendance calculation).
 */
export default function DesignerAccount() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const firstName = user?.name?.split(' ')[0] || 'Designer';
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'DS';

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-surface-card border-b border-border shadow-xs px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-xl font-bold font-heading text-text-primary tracking-tight">
            Designer Account
          </h1>
          <NotificationBellButton />
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <div className="flex flex-col gap-5 p-4 pb-28 max-w-4xl mx-auto w-full">
        {/* Profile Summary Card */}
        <Card
          padding="none"
          className="flex items-center gap-4 p-4 border border-border shadow-xs bg-surface-card rounded-lg"
        >
          {/* Avatar */}
          <div className="shrink-0 w-16 h-16 rounded-full border border-border overflow-hidden bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl shadow-inner">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={firstName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          {/* Name + Role */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-heading text-text-primary truncate">
                {user?.name || 'MEP Designer'}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                Designer
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Engineering & Design
            </p>
            <span className="text-[11px] font-mono text-text-muted mt-1 inline-block">
              Code: <strong className="text-text-primary">{user?.workerCode || 'DES-001'}</strong>
            </span>
          </div>
        </Card>

        {/* Role Permissions Card */}
        <Card padding="md" className="border border-border bg-surface-card shadow-xs flex flex-col gap-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
            <Layers size={14} className="text-primary" />
            <span>Role Permissions & Scope</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-secondary">
            <div className="flex items-center gap-2 p-2 rounded-md bg-surface border border-border">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
              <span>Global access to all active projects</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-surface border border-border">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
              <span>Multi-discipline drawing upload & revision control</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-surface border border-border">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
              <span>Max 3 versions FIFO queue enforcement</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-surface border border-border">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
              <span>Exempt from attendance / shift clock-in</span>
            </div>
          </div>
        </Card>

        {/* ── Settings & Security List ────────────────────────── */}
        <Card padding="none" className="overflow-hidden border border-border shadow-xs bg-surface-card rounded-lg divide-y divide-border">
          {/* Item 1: MEP Company ID */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Building2 size={18} className="text-text-secondary shrink-0" />
              <span className="text-sm text-text-primary font-medium">
                MEP Company ID
              </span>
            </div>
            <span className="text-xs text-text-secondary font-mono font-semibold">
              MEP-2026-X
            </span>
          </div>

          {/* Item 2: Mobile Number */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Smartphone size={18} className="text-text-secondary shrink-0" />
              <span className="text-sm text-text-primary font-medium">
                Registered Mobile
              </span>
            </div>
            <span className="text-xs text-text-secondary font-mono">
              {user?.mobile || 'Not configured'}
            </span>
          </div>

          {/* Item 3: Change PIN */}
          <button
            type="button"
            onClick={() => navigate('/designer/change-pin')}
            className="flex items-center justify-between w-full px-4 py-3.5 hover:bg-surface transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Lock size={18} className="text-text-secondary shrink-0" />
              <span className="text-sm text-text-primary font-medium">
                Change 6-Digit PIN
              </span>
            </div>
            <ChevronRight size={16} className="text-text-muted shrink-0" />
          </button>
        </Card>

        {/* ── Log Out ────────────────────────────────────────── */}
        <div className="flex justify-center pt-2">
          <Button
            variant="danger"
            size="sm"
            icon={LogOut}
            onClick={handleLogout}
          >
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
}
