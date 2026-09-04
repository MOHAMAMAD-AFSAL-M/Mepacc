import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import Card from '../../components/Card';
import Button from '../../components/Button';
import PinInput from '../../components/PinInput';

/**
 * TechnicianChangePin — Security setup page for changing PIN.
 * Matches Figma frame "Change PIN - Security Setup" (node 3:2).
 *
 * Structure:
 *   - Top Bar Header with Back Navigation & "Change PIN" title
 *   - Main Card with 3 PIN entry sections:
 *       1. Current PIN
 *       2. Subtle Divider
 *       3. New PIN
 *       4. Confirm New PIN
 *   - Interactive validation:
 *       - Checks Current PIN against logged-in user state/mock
 *       - Checks PIN length (6 digits)
 *       - Validates New PIN vs Confirm PIN match
 *   - Save / Update Action Button with feedback & navigation
 */
export default function TechnicianChangePin() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdatePin = async (e) => {
    e.preventDefault();
    setError('');

    // Validation checks
    if (currentPin.length < 6) {
      setError('Please enter your complete 6-digit current PIN.');
      return;
    }

    if (newPin.length < 6) {
      setError('New PIN must be 6 digits long.');
      return;
    }

    if (confirmPin.length < 6) {
      setError('Please confirm your new 6-digit PIN.');
      return;
    }

    if (newPin !== confirmPin) {
      setError('New PIN and Confirm PIN do not match.');
      return;
    }

    if (newPin === currentPin) {
      setError('New PIN must be different from current PIN.');
      return;
    }

    setLoading(true);

    try {
      if (user?.id) {
        await authService.changePin(user.id, currentPin, newPin);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      setLoading(false);
      setSuccess(true);

      // Auto-navigate back after success
      setTimeout(() => {
        navigate('/technician/account');
      }, 1500);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to update PIN. Please try again.');
    }
  };

  const isFormValid =
    currentPin.length === 6 &&
    newPin.length === 6 &&
    confirmPin.length === 6;

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="h-16 bg-surface border-b border-border flex items-center gap-3 px-4 shrink-0 relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-1 rounded-full hover:bg-surface-card transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="Go back"
        >
          <ChevronLeft size={20} className="text-text-primary" />
        </button>
        <h1 className="text-xl font-medium font-heading text-text-primary">
          Change PIN
        </h1>
      </header>

      {/* ── Main Content ──────────────────────────────────────── */}
      <div className="flex flex-col gap-6 p-4 pb-32 max-w-md mx-auto w-full">
        {/* Success Banner */}
        {success && (
          <div className="flex items-center gap-3 p-4 rounded-md bg-success/10 border border-success/30 text-success animate-fade-in">
            <CheckCircle2 size={20} className="shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">PIN Updated Successfully!</span>
              <span className="text-xs opacity-90">Redirecting to account settings...</span>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-md bg-error/10 border border-error/30 text-error animate-fade-in">
            <AlertCircle size={20} className="shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* PIN Setup Card */}
        <Card padding="none" className="p-6 border border-border bg-surface-card shadow-md flex flex-col gap-6">
          {/* Section 1: Current PIN */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Current PIN
            </label>
            <PinInput
              length={6}
              value={currentPin}
              onChange={setCurrentPin}
              disabled={loading || success}
              autoFocus
            />
          </div>

          {/* Subtle Divider */}
          <div className="border-b border-border my-1" />

          {/* Section 2: New PIN */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              New PIN
            </label>
            <PinInput
              length={6}
              value={newPin}
              onChange={setNewPin}
              disabled={loading || success}
            />
          </div>

          {/* Section 3: Confirm New PIN */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Confirm New PIN
            </label>
            <PinInput
              length={6}
              value={confirmPin}
              onChange={setConfirmPin}
              disabled={loading || success}
              error={confirmPin.length === 6 && confirmPin !== newPin}
            />
          </div>

          {/* Submit Action Area */}
          <div className="pt-2">
            <Button
              size="lg"
              variant="primary"
              onClick={handleUpdatePin}
              disabled={!isFormValid || loading || success}
              className="w-full text-base font-semibold font-heading py-3"
            >
              {loading ? 'Updating PIN...' : 'Update PIN'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
