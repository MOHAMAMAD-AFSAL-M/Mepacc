import { useNavigate } from 'react-router-dom';
import { Bell, Building2, Lock, ChevronRight, LogOut, User } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import Card from '../../components/Card';
import Button from '../../components/Button';
import NotificationBellButton from '../../components/NotificationBellButton';

/**
 * TechnicianAccount — Account & Settings landing page.
 * Matches Figma frame "Technician Account & Settings" (node 3:87).
 *
 * Sections:
 *   1. Header — "Account" title + notification bell
 *   2. Profile Card — avatar, name, role, "View & Edit Profile" link
 *   3. Settings List — MEP Company ID (read-only), Change PIN (navigable)
 *   4. Log Out button
 */
export default function TechnicianAccount() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Derive first name for the avatar fallback
  const firstName = user?.name?.split(' ')[0] || 'User';
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 relative z-10">
        <h1 className="text-2xl font-semibold font-heading text-text-primary tracking-tight">
          Account
        </h1>
        <NotificationBellButton />
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <div className="flex flex-col gap-6 p-4 pb-32">
        {/* ── Profile Card ───────────────────────────────────── */}
        <button
          onClick={() => navigate('/technician/profile')}
          className="w-full text-left"
        >
          <Card
            padding="none"
            className="flex items-center gap-4 p-4 border border-border hover:shadow-md transition-shadow duration-fast cursor-pointer"
          >
            {/* Avatar */}
            <div className="shrink-0 w-16 h-16 rounded-full border border-border-strong overflow-hidden bg-primary/10 flex items-center justify-center">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={firstName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold text-primary">
                  {initials}
                </span>
              )}
            </div>

            {/* Name + Role + Link */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-medium font-heading text-text-primary truncate">
                {firstName}
              </h2>
              <p className="text-sm text-text-secondary mb-1">
                {user?.role
                  ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                  : 'Technician'}
              </p>
              <span className="text-xs font-semibold text-primary-dark tracking-wide">
                View & Edit Profile
              </span>
            </div>

            {/* Chevron */}
            <ChevronRight size={14} className="text-text-muted shrink-0" />
          </Card>
        </button>

        {/* ── Settings List ──────────────────────────────────── */}
        <Card padding="none" className="overflow-hidden border border-border">
          {/* Item 1: MEP Company ID */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border">
            <div className="flex items-center gap-4">
              <Building2 size={20} className="text-text-secondary shrink-0" />
              <span className="text-base text-text-primary">
                MEP Company ID
              </span>
            </div>
            <span className="text-sm text-text-secondary font-heading">
              MEP-2026-X
            </span>
          </div>

          {/* Item 2: Change PIN */}
          <button
            onClick={() => navigate('/technician/change-pin')}
            className="flex items-center justify-between w-full px-4 py-4 hover:bg-surface transition-colors duration-fast"
          >
            <div className="flex items-center gap-4">
              <Lock size={18} className="text-text-secondary shrink-0" />
              <span className="text-base text-text-primary">Change PIN</span>
            </div>
            <ChevronRight size={14} className="text-text-muted shrink-0" />
          </button>
        </Card>

        {/* ── Log Out ────────────────────────────────────────── */}
        <div className="flex justify-center pt-4">
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
