import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../convex.js';
import useAuthStore from '../../store/authStore';
import Input from '../../components/Input';
import Card from '../../components/Card';

/**
 * DesignerProfile — Editable profile form page for Designers.
 * Matches the design pattern of Supervisor, Foreman, and Technician profiles.
 */
export default function DesignerProfile() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const navigate = useNavigate();

  const updateProfileMutation = useMutation(api.workers.updateSelfProfile);

  const nameParts = (user?.name || 'Designer User').split(' ');
  const [firstName, setFirstName] = useState(user?.firstName || nameParts[0] || '');
  const [lastName, setLastName] = useState(user?.lastName || nameParts.slice(1).join(' ') || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      
      // Update backend if user has valid worker ID
      if (user?.id) {
        await updateProfileMutation({
          workerId: user.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
      }

      // Update local auth store
      updateUser({
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
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
    <div className="flex flex-col min-h-screen bg-surface">
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
      <div className="flex flex-col items-center gap-6 p-4 pt-4 pb-28 max-w-md mx-auto w-full">
        {/* Profile Form Card */}
        <Card className="w-full border border-border shadow-sm p-6">
          <div className="flex flex-col gap-5">
            <Input
              label="First Name"
              id="profile-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter first name"
            />

            <Input
              label="Last Name"
              id="profile-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter last name"
            />

            <Input
              label="Worker Code / ID"
              id="profile-code"
              value={user?.workerCode || 'DES-001'}
              readOnly
              className="opacity-70 font-mono"
            />

            <Input
              label="Mobile Number"
              id="profile-mobile"
              value={user?.mobile || ''}
              readOnly
              className="opacity-70"
            />

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

        {/* Footer */}
        <p className="text-xs font-semibold text-text-secondary tracking-wide text-center">
          Last logged in: {lastLogin}
        </p>
      </div>
    </div>
  );
}
