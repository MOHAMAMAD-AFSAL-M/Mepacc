import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import PinInput from '../components/PinInput';

/**
 * PinSetup — New User PIN Setup screen.
 * Shown once after a new user's first login before reaching their role's home screen.
 * Replicates Stitch MCP frame: projects/12727634476904435172/screens/ae04d55fc8864a3eae4cbcbc07b612c4
 */
export default function PinSetup() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setInitialPin = useAuthStore((s) => s.setInitialPin);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // If user is not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const canSubmit = newPin.length === 6 && confirmPin.length === 6;

  // Format phone number for display (e.g. 9876543210 -> +91 98765 43210)
  const formatPhone = (ph) => {
    if (!ph) return '';
    const digits = ph.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return ph;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPin !== confirmPin) {
      setErrorMessage('PINs do not match. Please verify and try again.');
      return;
    }

    try {
      await setInitialPin(newPin);
      // Successfully updated initial PIN, navigate to role home screen
      const userRole = role || user.role;
      navigate(`/${userRole}/home`, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to set PIN. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 text-on-background antialiased">
      {/* Main Card — matching max-w-[420px] from Stitch spec */}
      <main className="w-full max-w-[420px] bg-surface-card border border-border rounded-lg shadow-card p-6">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2 font-heading leading-snug">
            {user.name}
          </h1>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-sm font-medium text-text-secondary">
              {formatPhone(user.phone)}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded border border-border bg-surface text-text-primary text-xs font-bold uppercase tracking-wider capitalize">
              {user.role}
            </span>
          </div>
        </header>

        {/* Divider */}
        <div className="w-full h-px bg-border-divider mb-6" />

        {/* Form */}
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {/* Inline Error Alert */}
          {errorMessage && (
            <div className="bg-error/10 border border-error/30 text-error text-xs rounded-md p-3 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Input Group 1: Set new PIN */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-primary">
              Set new 6-digit PIN
            </label>
            <PinInput
              length={6}
              value={newPin}
              onChange={(val) => {
                setNewPin(val);
                if (errorMessage) setErrorMessage('');
              }}
              error={!!errorMessage}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Input Group 2: Confirm PIN */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-primary">
              Confirm PIN
            </label>
            <PinInput
              length={6}
              value={confirmPin}
              onChange={(val) => {
                setConfirmPin(val);
                if (errorMessage) setErrorMessage('');
              }}
              error={!!errorMessage}
              disabled={isLoading}
            />
          </div>

          {/* Get Started Button */}
          <button
            type="submit"
            disabled={!canSubmit || isLoading}
            className="mt-2 w-full py-3 px-4 bg-primary hover:bg-primary-light active:bg-primary-dark text-text-inverse font-semibold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-text-inverse/30 border-t-text-inverse rounded-full animate-spin" />
            ) : (
              'Get Started'
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
