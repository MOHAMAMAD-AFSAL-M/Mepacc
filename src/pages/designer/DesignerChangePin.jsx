import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import * as authService from '../../services/authService';
import Card from '../../components/Card';
import Button from '../../components/Button';
import PinInput from '../../components/PinInput';

/**
 * DesignerChangePin — Security PIN change page for Designer role.
 */
export default function DesignerChangePin() {
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
      setTimeout(() => {
        navigate('/designer/account');
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
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-surface-card border-b border-border shadow-xs px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-1 rounded-md hover:bg-surface border border-border text-text-secondary hover:text-text-primary transition-colors shrink-0"
          aria-label="Go back"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-bold font-heading text-text-primary">
          Change 6-Digit PIN
        </h1>
      </header>

      {/* Main Content */}
      <div className="flex flex-col gap-5 p-4 pb-28 max-w-md mx-auto w-full">
        {/* Success Banner */}
        {success && (
          <div className="flex items-center gap-3 p-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 animate-fade-in text-xs font-semibold">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <div className="flex flex-col">
              <span>PIN Updated Successfully!</span>
              <span className="font-normal opacity-90">Redirecting to account...</span>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 animate-fade-in text-xs font-semibold">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PIN Setup Card */}
        <Card padding="none" className="p-5 border border-border bg-surface-card shadow-sm rounded-lg flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
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

          <div className="border-b border-border my-0.5" />

          <div className="flex flex-col gap-1.5">
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

          <div className="flex flex-col gap-1.5">
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

          <div className="pt-2">
            <Button
              size="lg"
              variant="primary"
              onClick={handleUpdatePin}
              disabled={!isFormValid || loading || success}
              className="w-full text-sm font-semibold font-heading py-3"
            >
              {loading ? 'Updating PIN...' : 'Update PIN'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
