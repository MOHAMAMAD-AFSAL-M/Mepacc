import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import Input from '../../components/Input';
import Card from '../../components/Card';

/**
 * ForemanProfile — editable profile form page for foremen.
 * Uses the exact same design and structure as TechnicianProfile.
 */
export default function ForemanProfile() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  // Split the full name into first / last for the form fields
  const nameParts = (user?.name || '').split(' ');
  const [firstName, setFirstName] = useState(nameParts[0] || '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const lastLogin = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' at ' + new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40"
            aria-label="Go back"
          >
            <ChevronLeft size={20} className="text-primary-dark" />
          </button>
          <h1 className="text-2xl font-bold font-heading text-primary-dark tracking-tight">
            Profile
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={[
            'px-5 py-2 rounded-sm text-xs font-semibold tracking-wide text-white',
            'transition-colors duration-fast',
            saving
              ? 'bg-primary/60 cursor-wait'
              : saved
                ? 'bg-success'
                : 'bg-primary hover:bg-primary-light active:bg-primary-dark',
          ].join(' ')}
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </header>

      {/* ── Main Content ──────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-10 p-4 pt-4 pb-16">
        {/* ── Profile Form Card ─────────────────────────────── */}
        <Card className="w-full border border-border shadow-md p-6">
          <div className="flex flex-col gap-6">
            {/* First Name */}
            <Input
              label="First Name"
              id="profile-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter first name"
            />

            {/* Last Name */}
            <Input
              label="Last Name"
              id="profile-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter last name"
            />

            {/* Mobile (read-only) */}
            <Input
              label="Mobile"
              id="profile-mobile"
              value={user?.mobile || user?.phone || ''}
              readOnly
              className="opacity-70"
            />

            {/* Email (optional) */}
            <Input
              label="Email (Optional)"
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
            />
          </div>
        </Card>

        {/* ── System Information ──────────────────────────────── */}
        <p className="text-xs font-semibold text-text-secondary tracking-wide text-center">
          Last logged in: {lastLogin}
        </p>
      </div>
    </div>
  );
}
